import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { QuestionSpec, SenseSpec } from "../../src/features/content/curated";
import { senseSlugs } from "../../src/lib/markup";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIR = path.join(ROOT, "content/curated");

function readAll<T>(sub: string, schema: z.ZodType<T>): T[] {
  const dir = path.join(DIR, sub);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .flatMap((f) => {
      const raw = parse(fs.readFileSync(path.join(dir, f), "utf8")) as unknown[];
      return raw.map((item, i) => {
        const r = schema.safeParse(item);
        if (!r.success) throw new Error(`${sub}/${f}[${i}]: ${z.prettifyError(r.error)}`);
        return r.data;
      });
    });
}

export function loadCurated() {
  const senses = readAll("vocab", SenseSpec);
  const questions = readAll("questions", QuestionSpec);
  return { senses, questions };
}

/** Cross-reference checks: every slug referenced anywhere must exist. */
export function validateCurated(c: ReturnType<typeof loadCurated>): string[] {
  const errors: string[] = [];
  const dupes = (label: string, slugs: string[]) =>
    slugs
      .filter((s, i) => slugs.indexOf(s) !== i)
      .forEach((s) => errors.push(`duplicate ${label} slug ${s}`));
  dupes(
    "sense",
    c.senses.map((s) => s.slug),
  );
  dupes(
    "question",
    c.questions.map((q) => q.slug),
  );

  const senseSet = new Set(c.senses.map((s) => s.slug));
  for (const q of c.questions) {
    for (const s of q.senses)
      if (!senseSet.has(s)) errors.push(`question ${q.slug}: unknown sense ${s}`);
    if (q.type === "mcq_meaning")
      for (const s of senseSlugs(q.stem))
        if (!senseSet.has(s)) errors.push(`question ${q.slug}: markup sense ${s}`);
  }
  return errors;
}
