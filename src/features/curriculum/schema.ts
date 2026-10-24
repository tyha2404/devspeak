import { z } from "zod";
import { Cefr } from "@/features/content/curated";

// Authoring formats for the study tracks: content/curriculum/stages.yaml and
// content/curriculum/<stage>/<NN>-<unit>.yaml. Lessons reference questions and senses by slug;
// answer keys stay in the question bank and never appear here.

const Slug = z.string().regex(/^[a-z0-9-]+$/);
const L10n = z.object({ en: z.string().min(1), vi: z.string().min(1) });

/** `grammar`: units are CEFR levels, lessons grammar points. `vocab`: units are topics, lessons word sets. */
export const Track = z.enum(["grammar", "vocab"]);
export type Track = z.infer<typeof Track>;

export const StageSpec = z.object({
  slug: Slug,
  sort: z.number().int().min(1),
  track: Track,
  cefr: Cefr,
  title: L10n,
  tagline_vi: z.string(),
  description_vi: z.string(),
});
export type StageSpec = z.infer<typeof StageSpec>;

const LessonBase = z.object({
  slug: Slug,
  title: L10n,
  est_minutes: z.number().int().min(1).max(30).optional(),
  /** Authored question slugs (grammar); the seed adds the generated test items. */
  questions: z.array(Slug).default([]),
});

/**
 * A grammar point taught in five study screens before its test: overview, functions, structure,
 * annotated examples, contrast + self-correction. Everything here is public teaching material.
 */
export const GrammarBody = z.object({
  title_vi: z.string(),
  group: z.string(),
  overview: z.object({
    focus: z.string(),
    formulas: z.array(z.string()).min(1).max(4),
    hook: z.string(),
  }),
  functions: z
    .array(
      z.object({ title: z.string(), explain: z.string(), examples: z.array(z.string()).min(1) }),
    )
    .min(2)
    .max(6),
  structure: z.object({
    forms: z
      .array(z.object({ label: z.string(), pattern: z.string(), example: z.string() }))
      .min(2)
      .max(6),
    steps: z
      .array(z.object({ title: z.string(), explain: z.string(), example: z.string() }))
      .min(2)
      .max(5),
  }),
  examples: z
    .array(z.object({ tag: z.string(), en: z.string(), vi: z.string(), note: z.string() }))
    .min(3)
    .max(8),
  contrast: z.object({
    title: z.string(),
    rows: z
      .array(z.object({ label: z.string(), note: z.string(), example: z.string() }))
      .min(2)
      .max(6),
    fixes: z
      .array(z.object({ wrong: z.string(), right: z.string(), why: z.string() }))
      .min(2)
      .max(5),
  }),
});
export type GrammarBody = z.infer<typeof GrammarBody>;

export const LessonSpec = z.discriminatedUnion("kind", [
  LessonBase.extend({ kind: z.literal("vocab"), senses: z.array(Slug).min(1).max(36) }),
  LessonBase.extend({ kind: z.literal("grammar"), grammar: GrammarBody }),
]);
export type LessonSpec = z.infer<typeof LessonSpec>;
export type LessonKind = LessonSpec["kind"];

export const DEFAULT_MINUTES: Record<LessonKind, number> = { vocab: 6, grammar: 12 };

export const UnitSpec = z
  .object({
    slug: Slug,
    stage: Slug,
    sort: z.number().int().min(1),
    /** Label shown to learners: the CEFR level ("A1") for grammar, "T01" for topics. */
    code: z.string().regex(/^([ABC][12]|T\d{2})$/),
    kind: z.enum(["grammar", "topic"]),
    cefr: Cefr,
    title: L10n,
    summary_vi: z.string(),
    can_do: z.array(z.string()).min(1).max(4),
    /** Ready for learners; draft units show as "coming soon". */
    status: z.enum(["published", "draft"]).default("draft"),
    lessons: z.array(LessonSpec).default([]),
  })
  .superRefine((u, ctx) => {
    if (/^T/.test(u.code) !== (u.kind === "topic"))
      ctx.addIssue({ code: "custom", message: `${u.slug}: code ${u.code} does not match kind` });
    if (u.status === "published" && u.lessons.length < 1)
      ctx.addIssue({ code: "custom", message: `${u.slug}: a published unit needs lessons` });
    const slugs = u.lessons.map((l) => l.slug);
    if (new Set(slugs).size !== slugs.length)
      ctx.addIssue({ code: "custom", message: `${u.slug}: duplicate lesson slugs` });
  });
export type UnitSpec = z.infer<typeof UnitSpec>;
