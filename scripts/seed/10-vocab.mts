/**
 * NGSL ranks + CEFR-J levels → lexemes / word_forms. Idempotent (upsert on natural keys).
 * Curated lexemes keep their reviewed CEFR; imports only fill gaps and ranks.
 */
import fs from "node:fs";
import path from "node:path";
import { chunks, db, must, RAW, upsertSources } from "./lib.mts";
import { cefrFromRank, normalizePos, parseCsv, splitHeadword } from "./parse.ts";

const client = db();
const ids = await upsertSources();

// ----- NGSL: frequency rank per lemma -----
const ngsl = parseCsv(fs.readFileSync(path.join(RAW, "ngsl/NGSL_12_stats.csv"), "utf8"));
const rank = new Map<string, number>();
for (const r of ngsl) {
  const lemma = (r.Lemma ?? "").toLowerCase();
  const n = Number(r["SFI Rank"]);
  if (lemma && Number.isFinite(n) && !rank.has(lemma)) rank.set(lemma, n);
}
console.log(`NGSL: ${rank.size} lemmas`);

// ----- CEFR-J: (headword, pos) → level -----
const cefrj = parseCsv(
  fs.readFileSync(path.join(RAW, "cefrj/cefrj-vocabulary-profile-1.5.csv"), "utf8"),
);
const rows = new Map<
  string,
  {
    display: string;
    normalized: string;
    pos: string;
    cefr: string;
    forms: string[];
    source: number;
  }
>();
for (const r of cefrj) {
  if (!r.headword || !r.CEFR) continue;
  const h = splitHeadword(r.headword);
  const pos = normalizePos(r.pos ?? "");
  rows.set(`${h.normalized}|${pos}`, {
    ...h,
    pos,
    cefr: r.CEFR.toUpperCase(),
    source: ids["cefrj-1.5"]!,
  });
}
// NGSL lemmas not covered by CEFR-J get a heuristic level from their rank.
const covered = new Set([...rows.values()].map((r) => r.normalized));
for (const [lemma, n] of rank) {
  if (covered.has(lemma)) continue;
  rows.set(`${lemma}|other`, {
    display: lemma,
    normalized: lemma,
    pos: "other",
    cefr: cefrFromRank(n),
    forms: [lemma],
    source: ids["ngsl-1.2"]!,
  });
}
console.log(`lexeme rows: ${rows.size}`);

// Curated lexemes (reviewed CEFR) must not be overwritten.
const curated = must(
  await client.from("lexemes").select("normalized, pos").eq("cefr_source", "curated"),
  "curated",
) as {
  normalized: string;
  pos: string;
}[];
const keep = new Set(curated.map((c) => `${c.normalized}|${c.pos}`));

const list = [...rows.values()].filter((r) => !keep.has(`${r.normalized}|${r.pos}`));
await chunks(list, 500, async (chunk) => {
  const lexemes = must(
    await client
      .from("lexemes")
      .upsert(
        chunk.map((r) => ({
          display: r.display,
          normalized: r.normalized,
          pos: r.pos,
          cefr: r.cefr,
          cefr_source: r.source === ids["cefrj-1.5"] ? "cefrj" : "ngsl_rank",
          cefr_confidence: r.source === ids["cefrj-1.5"] ? "high" : "med",
          ngsl_rank: rank.get(r.normalized) ?? null,
          source_id: r.source,
        })),
        { onConflict: "normalized,pos" },
      )
      .select("id, normalized, pos"),
    "lexemes",
  ) as { id: number; normalized: string; pos: string }[];
  const forms = lexemes.flatMap((l) =>
    (rows.get(`${l.normalized}|${l.pos}`)?.forms ?? [l.normalized]).map((form) => ({
      form,
      lexeme_id: l.id,
    })),
  );
  must(
    await client
      .from("word_forms")
      .upsert(forms, { onConflict: "form,lexeme_id", ignoreDuplicates: true }),
    "forms",
  );
});

// Ranks onto curated lexemes too (used by the level check of generated items).
for (const c of curated) {
  const n = rank.get(c.normalized);
  if (n)
    await client
      .from("lexemes")
      .update({ ngsl_rank: n })
      .eq("normalized", c.normalized)
      .eq("pos", c.pos);
}
console.log("vocab import done");
