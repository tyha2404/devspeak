import { z } from "zod";
import { Cefr } from "@/features/content/curated";

// Authoring formats for the learning path: content/curriculum/stages.yaml and
// content/curriculum/<stage>/<NN>-<unit>.yaml. Lessons reference questions, senses and dialogues
// by slug; answer keys stay in the question bank and never appear here.

const Slug = z.string().regex(/^[a-z0-9-]+$/);
const L10n = z.object({ en: z.string().min(1), vi: z.string().min(1) });

/** Characters who guide a unit (the former NPCs); portraits come from the character sheet. */
export const CharacterId = z.enum([
  "linh",
  "tuan",
  "sarah",
  "dave",
  "emma",
  "raj",
  "kenji",
  "mike",
  "robert",
  "mentee",
]);
export type CharacterId = z.infer<typeof CharacterId>;

export const StageSpec = z.object({
  slug: Slug,
  sort: z.number().int().min(1),
  cefr: Cefr,
  title: L10n,
  tagline_vi: z.string(),
  description_vi: z.string(),
  /** Checkpoint exam: drawn from the stage's units' questions. */
  checkpoint: z
    .object({
      size: z.number().int().min(4).max(30).default(12),
      pass_pct: z.number().int().min(50).max(100).default(70),
    })
    .default({ size: 12, pass_pct: 70 }),
});
export type StageSpec = z.infer<typeof StageSpec>;

const LessonBase = z.object({
  slug: Slug,
  title: L10n,
  est_minutes: z.number().int().min(1).max(30).optional(),
  xp: z.number().int().min(0).max(100).optional(),
  /** Question slugs graded in this lesson (order kept; `count` samples a subset per run). */
  questions: z.array(Slug).default([]),
  count: z.number().int().min(1).optional(),
  pass_pct: z.number().int().min(0).max(100).default(60),
});

const Example = z.object({ en: z.string(), vi: z.string().optional() });

export const LessonSpec = z.discriminatedUnion("kind", [
  LessonBase.extend({ kind: z.literal("vocab"), senses: z.array(Slug).min(1).max(12) }),
  LessonBase.extend({ kind: z.literal("dialogue"), dialogue: Slug }),
  LessonBase.extend({
    kind: z.literal("focus"),
    /** Short Vietnamese explanation (Markdown, no HTML). */
    body_vi: z.string().min(1),
    examples: z.array(Example).default([]),
  }),
  LessonBase.extend({ kind: z.literal("practice") }),
  LessonBase.extend({
    kind: z.literal("reading"),
    passage: z.object({
      text: z.string().min(1),
      source: z.string(),
      url: z.url().optional(),
      license: z.string(),
      adapted: z.boolean().default(false),
    }),
  }),
  LessonBase.extend({ kind: z.literal("listening") }),
  LessonBase.extend({ kind: z.literal("mistakes"), mistakes: z.array(Slug).min(1) }),
  LessonBase.extend({
    kind: z.literal("task"),
    mode: z.enum(["write", "speak"]),
    context: z.array(z.object({ speaker: z.string(), text: z.string() })).default([]),
    prompt: L10n,
    /** Words/phrases a good answer usually contains (heuristic fallback + rubric hint). */
    keywords: z.array(z.string()).default([]),
    model_answer: z.string(),
  }),
]);
export type LessonSpec = z.infer<typeof LessonSpec>;
export type LessonKind = LessonSpec["kind"];

export const DEFAULT_MINUTES: Record<LessonKind, number> = {
  vocab: 6,
  dialogue: 6,
  focus: 7,
  practice: 8,
  reading: 8,
  listening: 6,
  mistakes: 4,
  task: 8,
};
export const DEFAULT_XP: Record<LessonKind, number> = {
  vocab: 15,
  dialogue: 15,
  focus: 15,
  practice: 20,
  reading: 20,
  listening: 15,
  mistakes: 10,
  task: 30,
};

export const RoleplaySpec = z.object({
  goal: L10n,
  opener: z.string(),
  target_words: z.array(z.string()).default([]),
});

export const UnitSpec = z
  .object({
    slug: Slug,
    stage: Slug,
    sort: z.number().int().min(1),
    /** Path label shown to learners, e.g. "S3" or "K1". */
    code: z.string().regex(/^[SK]\d{1,2}$/),
    kind: z.enum(["situation", "knowledge"]),
    cefr: Cefr,
    character: CharacterId,
    title: L10n,
    summary_vi: z.string(),
    can_do: z.array(z.string()).min(1).max(4),
    /** Ready for learners; draft units show as "coming soon". */
    status: z.enum(["published", "draft"]).default("draft"),
    lessons: z.array(LessonSpec).default([]),
    roleplay: RoleplaySpec.optional(),
  })
  .superRefine((u, ctx) => {
    if (u.code.startsWith("S") !== (u.kind === "situation"))
      ctx.addIssue({ code: "custom", message: `${u.slug}: code ${u.code} does not match kind` });
    if (u.status === "published" && u.lessons.length < 2)
      ctx.addIssue({ code: "custom", message: `${u.slug}: a published unit needs ≥2 lessons` });
    const slugs = u.lessons.map((l) => l.slug);
    if (new Set(slugs).size !== slugs.length)
      ctx.addIssue({ code: "custom", message: `${u.slug}: duplicate lesson slugs` });
  });
export type UnitSpec = z.infer<typeof UnitSpec>;

export const SituationSpec = z.object({
  slug: Slug,
  category: z.enum([
    "onboarding",
    "chat",
    "meetings",
    "code-review",
    "qa",
    "incident",
    "tech-discussion",
    "writing",
    "client",
    "career",
    "remote-culture",
    "community",
  ]),
  cefr: Cefr,
  title: L10n,
  context_vi: z.string(),
  phrases: z
    .array(
      z.object({
        en: z.string(),
        vi: z.string(),
        register: z.enum(["casual", "neutral", "formal"]).default("neutral"),
      }),
    )
    .min(3)
    .max(10),
  mistakes: z.array(Slug).default([]),
  unit: Slug.optional(),
  roleplay: RoleplaySpec.extend({ character: CharacterId }).optional(),
});
export type SituationSpec = z.infer<typeof SituationSpec>;

export const MistakeSpec = z.object({
  slug: Slug,
  kind: z.enum(["grammar", "word-choice", "pronunciation", "symbol", "register"]),
  wrong: z.string().optional(),
  right: z.string(),
  /** IPA or a respelling for pronunciation items. */
  say: z.string().optional(),
  explanation_vi: z.string(),
  tags: z.array(z.string()).default([]),
});
export type MistakeSpec = z.infer<typeof MistakeSpec>;
