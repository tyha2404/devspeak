/**
 * English–Vietnamese example sentences from Tatoeba for every sense that has fewer than 3 examples.
 * Streams the 100+ MB English dump and keeps only sentences linked to a Vietnamese translation.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { db, must, RAW, upsertSources } from "./lib.mts";
import { containsAnyForm, parseTsv, wordCount } from "./parse.ts";

const client = db();
const ids = await upsertSources();
const dir = path.join(RAW, "tatoeba");

const vie = new Map(
  parseTsv(fs.readFileSync(path.join(dir, "vie_sentences.tsv"), "utf8")).map(([id, , text]) => [
    id!,
    text!,
  ]),
);
const engToVie = new Map<string, string>();
for (const [vieId, engId] of parseTsv(
  fs.readFileSync(path.join(dir, "vie-eng_links.tsv"), "utf8"),
)) {
  if (vie.has(vieId!) && !engToVie.has(engId!)) engToVie.set(engId!, vieId!);
}

const pairs: { engId: string; en: string; vi: string }[] = [];
const rl = readline.createInterface({
  input: fs.createReadStream(path.join(dir, "eng_sentences.tsv"), "utf8"),
  crlfDelay: Infinity,
});
for await (const line of rl) {
  const tab = line.indexOf("\t");
  const id = line.slice(0, tab);
  const vieId = engToVie.get(id);
  if (!vieId) continue;
  const en = line.slice(line.indexOf("\t", tab + 1) + 1);
  const n = wordCount(en);
  if (n >= 4 && n <= 15) pairs.push({ engId: id, en, vi: vie.get(vieId)! });
}
console.log(`Tatoeba en–vi pairs (4–15 words): ${pairs.length}`);

const senses = must(
  await client.from("senses").select("id, lexeme_id, examples(id)").limit(20000),
  "senses",
) as { id: number; lexeme_id: number; examples: { id: number }[] }[];
const forms = must(
  await client.from("word_forms").select("form, lexeme_id").limit(100000),
  "forms",
) as {
  form: string;
  lexeme_id: number;
}[];
const formsBy = new Map<number, string[]>();
for (const f of forms) formsBy.set(f.lexeme_id, [...(formsBy.get(f.lexeme_id) ?? []), f.form]);

let added = 0;
for (const s of senses) {
  const need = 3 - s.examples.length;
  if (need <= 0) continue;
  const fs_ = formsBy.get(s.lexeme_id) ?? [];
  if (!fs_.length) continue;
  const matches = pairs.filter((p) => containsAnyForm(p.en, fs_)).slice(0, need);
  if (!matches.length) continue;
  must(
    await client.from("examples").upsert(
      matches.map((m) => ({
        sense_id: s.id,
        text_en: m.en,
        text_vi: m.vi,
        source_id: ids.tatoeba!,
        source_ref: `tatoeba:${m.engId}`,
      })),
      { onConflict: "sense_id,text_en", ignoreDuplicates: true },
    ),
    `examples ${s.id}`,
  );
  added += matches.length;
}
console.log(`examples added: ${added}`);
