import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import {
  grammarTestOrder,
  grammarTranslations,
  vocabTest,
} from "../../src/features/curriculum/autoquiz";
import { StageSpec, UnitSpec } from "../../src/features/curriculum/schema";
import type { loadCurated } from "./curated";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIR = path.join(ROOT, "content", "curriculum");

function parseOne<T>(file: string, raw: unknown, schema: z.ZodType<T>): T {
  const r = schema.safeParse(raw);
  if (!r.success) throw new Error(`${path.relative(ROOT, file)}: ${z.prettifyError(r.error)}`);
  return r.data;
}

export function loadCurriculum() {
  const stagesFile = path.join(DIR, "stages.yaml");
  const stages = (parse(fs.readFileSync(stagesFile, "utf8")) as unknown[]).map((s, i) =>
    parseOne(`${stagesFile}[${i}]`, s, StageSpec),
  );
  const units = fs
    .readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((d) =>
      fs
        .readdirSync(path.join(DIR, d.name))
        .filter((f) => f.endsWith(".yaml"))
        .sort()
        .map((f) => {
          const file = path.join(DIR, d.name, f);
          return parseOne(file, parse(fs.readFileSync(file, "utf8")), UnitSpec);
        }),
    );
  return { stages, units };
}
export type Curriculum = ReturnType<typeof loadCurriculum>;

/** Every slug a unit or lesson references must exist; ordering must be unambiguous. */
export function validateCurriculum(
  c: Curriculum,
  content: ReturnType<typeof loadCurated>,
): string[] {
  const errors: string[] = [];
  const dupes = (label: string, slugs: string[]) =>
    slugs
      .filter((s, i) => slugs.indexOf(s) !== i)
      .forEach((s) => errors.push(`duplicate ${label} ${s}`));
  dupes(
    "stage",
    c.stages.map((s) => s.slug),
  );
  dupes(
    "stage sort",
    c.stages.map((s) => String(s.sort)),
  );
  dupes(
    "unit",
    c.units.map((u) => u.slug),
  );
  dupes(
    "unit code",
    c.units.map((u) => u.code),
  );
  dupes(
    "lesson",
    c.units.flatMap((u) => u.lessons.map((l) => l.slug)),
  );

  const stageSlugs = new Set(c.stages.map((s) => s.slug));
  const senses = new Set(content.senses.map((s) => s.slug));
  const questions = new Set(content.questions.map((q) => q.slug));
  for (const stage of c.stages)
    dupes(
      `unit sort in ${stage.slug}:`,
      c.units.filter((u) => u.stage === stage.slug).map((u) => String(u.sort)),
    );
  for (const u of c.units) {
    if (!stageSlugs.has(u.stage)) errors.push(`unit ${u.slug}: unknown stage ${u.stage}`);
    for (const l of u.lessons) {
      const where = `${u.slug}/${l.slug}`;
      for (const q of l.questions)
        if (!questions.has(q)) errors.push(`${where}: unknown question ${q}`);
      if (l.kind === "vocab")
        for (const s of l.senses) if (!senses.has(s)) errors.push(`${where}: unknown sense ${s}`);
      if (l.kind === "grammar" && u.status === "published" && l.questions.length === 0)
        errors.push(`${where}: a grammar lesson needs authored questions`);
    }
  }
  return errors;
}

/**
 * Every lesson gets a ForumFlash-shaped test: a word set has a bank covering every word, a
 * grammar point by its authored items plus translations built from its examples. Generated
 * questions are appended to the curated bank (seeded like any other).
 */
export function expandTrackLessons(c: Curriculum, content: ReturnType<typeof loadCurated>) {
  const senses = new Map(content.senses.map((s) => [s.slug, s]));
  let generated = 0;
  for (const u of c.units)
    for (const l of u.lessons) {
      if (l.kind === "vocab") {
        const extra = vocabTest(
          l.slug,
          l.senses.map((s) => senses.get(s)).filter((s) => !!s),
          Math.max(16, l.senses.length),
        );
        l.questions = extra.map((q) => q.slug);
        content.questions.push(...extra);
        generated += extra.length;
      } else {
        const extra = grammarTranslations(l.slug, u.cefr, l.grammar);
        l.questions = grammarTestOrder(
          l.questions,
          extra.map((q) => q.slug),
        );
        content.questions.push(...extra);
        generated += extra.length;
      }
    }
  return generated;
}
