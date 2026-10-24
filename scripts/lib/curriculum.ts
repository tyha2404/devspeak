import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import {
  MistakeSpec,
  SituationSpec,
  StageSpec,
  UnitSpec,
} from "../../src/features/curriculum/schema";
import {
  grammarTestOrder,
  grammarTranslations,
  vocabTest,
} from "../../src/features/curriculum/autoquiz";
import type { loadCurated } from "./curated";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DIR = path.join(ROOT, "content");

function parseOne<T>(file: string, raw: unknown, schema: z.ZodType<T>): T {
  const r = schema.safeParse(raw);
  if (!r.success) throw new Error(`${path.relative(ROOT, file)}: ${z.prettifyError(r.error)}`);
  return r.data;
}

function readList<T>(dir: string, schema: z.ZodType<T>): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .flatMap((f) => {
      const file = path.join(dir, f);
      const raw = parse(fs.readFileSync(file, "utf8")) as unknown[];
      return raw.map((item, i) => parseOne(`${file}[${i}]`, item, schema));
    });
}

export function loadCurriculum() {
  const curriculumDir = path.join(DIR, "curriculum");
  const stagesFile = path.join(curriculumDir, "stages.yaml");
  const stages = (parse(fs.readFileSync(stagesFile, "utf8")) as unknown[]).map((s, i) =>
    parseOne(`${stagesFile}[${i}]`, s, StageSpec),
  );
  const units = fs
    .readdirSync(curriculumDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((d) =>
      fs
        .readdirSync(path.join(curriculumDir, d.name))
        .filter((f) => f.endsWith(".yaml"))
        .sort()
        .map((f) => {
          const file = path.join(curriculumDir, d.name, f);
          return parseOne(file, parse(fs.readFileSync(file, "utf8")), UnitSpec);
        }),
    );
  const mistakes = readList(path.join(DIR, "mistakes"), MistakeSpec);
  const situations = readList(path.join(DIR, "situations"), SituationSpec);
  return { stages, units, mistakes, situations };
}
export type Curriculum = ReturnType<typeof loadCurriculum>;

/** Every slug a unit, lesson or situation references must exist; ordering must be unambiguous. */
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
  dupes(
    "mistake",
    c.mistakes.map((m) => m.slug),
  );
  dupes(
    "situation",
    c.situations.map((s) => s.slug),
  );

  const stageSlugs = new Set(c.stages.map((s) => s.slug));
  const unitSlugs = new Set(c.units.map((u) => u.slug));
  const senses = new Set(content.senses.map((s) => s.slug));
  const questions = new Set(content.questions.map((q) => q.slug));
  const dialogues = new Set(content.dialogues.map((d) => d.slug));
  const mistakes = new Set(c.mistakes.map((m) => m.slug));

  for (const stage of c.stages) {
    const sorts = c.units.filter((u) => u.stage === stage.slug).map((u) => String(u.sort));
    dupes(`unit sort in ${stage.slug}:`, sorts);
  }
  for (const u of c.units) {
    if (!stageSlugs.has(u.stage)) errors.push(`unit ${u.slug}: unknown stage ${u.stage}`);
    for (const l of u.lessons) {
      const where = `${u.slug}/${l.slug}`;
      for (const q of l.questions)
        if (!questions.has(q)) errors.push(`${where}: unknown question ${q}`);
      if (l.count && l.count > l.questions.length)
        errors.push(`${where}: count ${l.count} > ${l.questions.length} questions`);
      if (l.kind === "vocab")
        for (const s of l.senses) if (!senses.has(s)) errors.push(`${where}: unknown sense ${s}`);
      if (l.kind === "dialogue" && !dialogues.has(l.dialogue))
        errors.push(`${where}: unknown dialogue ${l.dialogue}`);
      if (l.kind === "mistakes")
        for (const m of l.mistakes)
          if (!mistakes.has(m)) errors.push(`${where}: unknown mistake ${m}`);
      const graded = ["practice", "listening", "reading", "focus", "grammar"].includes(l.kind);
      if (u.status === "published" && graded && l.questions.length === 0)
        errors.push(`${where}: a ${l.kind} lesson needs questions`);
    }
  }
  for (const s of c.situations) {
    if (s.unit && !unitSlugs.has(s.unit))
      errors.push(`situation ${s.slug}: unknown unit ${s.unit}`);
    for (const m of s.mistakes)
      if (!mistakes.has(m)) errors.push(`situation ${s.slug}: unknown mistake ${m}`);
  }
  return errors;
}

/**
 * Study-track lessons get ForumFlash-shaped tests: a vocabulary set is tested by 16 generated
 * questions, a grammar point by its authored items plus translations built from its examples.
 * Generated questions are appended to the curated bank (seeded like any other); every track
 * lesson then scores 80% to pass and pays by stars.
 */
export function expandTrackLessons(c: Curriculum, content: ReturnType<typeof loadCurated>) {
  const trackOf = new Map(c.stages.map((s) => [s.slug, s.track]));
  const senses = new Map(content.senses.map((s) => [s.slug, s]));
  let generated = 0;
  for (const u of c.units) {
    if ((trackOf.get(u.stage) ?? "career") === "career") continue;
    for (const l of u.lessons) {
      let extra: ReturnType<typeof vocabTest> = [];
      if (l.kind === "vocab") {
        extra = vocabTest(
          l.slug,
          l.senses.map((s) => senses.get(s)).filter((s) => !!s),
        );
        l.questions = extra.map((q) => q.slug);
      } else if (l.kind === "grammar") {
        extra = grammarTranslations(l.slug, u.cefr, l.grammar);
        l.questions = grammarTestOrder(
          l.questions,
          extra.map((q) => q.slug),
        );
      }
      content.questions.push(...extra);
      generated += extra.length;
      l.count = undefined;
      l.pass_pct = 80;
      l.xp = 80;
    }
  }
  return generated;
}
