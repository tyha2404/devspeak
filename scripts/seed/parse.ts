// Pure parsing helpers for dataset imports (unit-tested in parse.test.ts).

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  return body.map((r) =>
    Object.fromEntries(header!.map((h, i) => [h.replace(/^﻿/, "").trim(), (r[i] ?? "").trim()])),
  );
}

/** "a.m./A.M./am/AM" → display "a.m.", forms ["a.m.", "am"] (lowercased, deduped). */
export function splitHeadword(h: string) {
  const parts = h
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  const forms = [...new Set(parts.map((p) => p.toLowerCase()))];
  return { display: parts[0]!, normalized: forms[0]!, forms };
}

const POS_MAP: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  preposition: "preposition",
  conjunction: "conjunction",
  determiner: "determiner",
  pronoun: "pronoun",
  interjection: "interjection",
  number: "number",
};
export const normalizePos = (pos: string) => POS_MAP[pos.toLowerCase().trim()] ?? "other";

/** Frequency-band heuristic for words without a CEFR tag (calibrate against CEFR-J). */
export function cefrFromRank(rank: number | null): "A1" | "A2" | "B1" | "B2" | "C1" {
  if (rank === null) return "C1";
  if (rank <= 600) return "A1";
  if (rank <= 1300) return "A2";
  if (rank <= 2100) return "B1";
  if (rank <= 2809) return "B2";
  return "C1";
}

export const wordCount = (s: string) => s.trim().split(/\s+/).length;

/** Whole-word, case-insensitive match of any form inside a sentence. */
export function containsAnyForm(sentence: string, forms: string[]) {
  const s = ` ${sentence.toLowerCase().replace(/[^\p{L}\p{N}' -]/gu, " ")} `;
  return forms.some((f) => s.includes(` ${f.toLowerCase()} `));
}

export function parseTsv(text: string) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));
}
