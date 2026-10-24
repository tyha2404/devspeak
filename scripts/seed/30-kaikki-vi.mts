/**
 * Vietnamese Wiktionary (Kaikki `vi-extract.jsonl`) → draft senses for imported lexemes that have none.
 * Candidates land with review_status 'draft' and appear in /admin/senses for a bilingual editor.
 *
 * Usage: pnpm seed:kaikki <path/to/vi-extract.jsonl> [--limit 2000]
 */
import fs from "node:fs";
import readline from "node:readline";
import zlib from "node:zlib";
import { chunks, db, must, upsertSources } from "./lib.mts";

const file = process.argv[2];
if (!file) throw new Error("usage: seed:kaikki <vi-extract.jsonl[.gz]> [--limit N]");
const limit = Number(process.argv[process.argv.indexOf("--limit") + 1] ?? 2000) || 2000;
const client = db();
const ids = await upsertSources();

// Lexemes that still need a sense, most frequent first.
const lexemes = must(
  await client
    .from("lexemes")
    .select("id, normalized, pos, ngsl_rank, senses(id)")
    .not("ngsl_rank", "is", null)
    .order("ngsl_rank")
    .limit(10000),
  "lexemes",
) as { id: number; normalized: string; pos: string; senses: { id: number }[] }[];
const wanted = new Map(lexemes.filter((l) => !l.senses.length).map((l) => [l.normalized, l]));
console.log(`lexemes without senses: ${wanted.size}`);

const input = fs.createReadStream(file);
const stream = file.endsWith(".gz") ? input.pipe(zlib.createGunzip()) : input;
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
const found: { lexeme_id: number; slug: string; definition_en: string; meaning_vi: string }[] = [];
for await (const line of rl) {
  if (found.length >= limit) break;
  let e: { word?: string; lang_code?: string; pos?: string; senses?: { glosses?: string[] }[] };
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  if (e.lang_code !== "en" || !e.word) continue;
  const lex = wanted.get(e.word.toLowerCase());
  const gloss = e.senses?.find((s) => s.glosses?.length)?.glosses?.[0];
  if (!lex || !gloss) continue;
  wanted.delete(e.word.toLowerCase());
  found.push({
    lexeme_id: lex.id,
    slug: `${lex.normalized.replace(/[^a-z0-9]+/g, "-")}-${lex.pos.slice(0, 3)}-${lex.id}`,
    definition_en: `(${e.pos ?? lex.pos}) ${e.word}`, // learner definition is written/enriched later
    meaning_vi: gloss.slice(0, 200),
  });
}
console.log(`candidate Vietnamese glosses: ${found.length}`);
await chunks(found, 500, async (chunk) => {
  must(
    await client.from("senses").upsert(
      chunk.map((f) => ({
        ...f,
        meaning_vi_source: "wiktionary_vi",
        review_status: "draft",
        source_id: ids["wiktionary-vi"]!,
      })),
      { onConflict: "slug", ignoreDuplicates: true },
    ),
    "senses",
  );
});
