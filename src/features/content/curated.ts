import { z } from "zod";

// Authoring formats for hand-written content in content/curated/**.yaml.
// The seed script turns these into DB rows; AI-generated items use the same question shapes.

export const Cefr = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const NpcId = z.enum([
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
  "attendee-a",
  "attendee-b",
]);

export const SenseSpec = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  lemma: z.string().min(1),
  pos: z.enum(["noun", "verb", "adjective", "adverb", "phrase", "phrasal_verb", "preposition"]),
  kind: z.enum(["word", "phrasal", "collocation", "phrase"]).default("word"),
  cefr: Cefr,
  topic: z.string(),
  it: z.boolean().default(false),
  ipa: z.string().optional(),
  def: z.string().max(300),
  vi: z.string().min(1),
  keep_en: z.boolean().default(false),
  note: z.string().optional(),
  forms: z.array(z.string()).default([]),
  examples: z.array(z.object({ en: z.string(), vi: z.string().optional() })).min(1),
});
export type SenseSpec = z.infer<typeof SenseSpec>;

const QBase = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  cefr: Cefr,
  npc: NpcId.optional(),
  topic: z.string(),
  senses: z.array(z.string()).default([]),
  hint_vi: z.string().optional(),
  explanation_vi: z.string(),
  explanation_en: z.string().optional(),
});

const options4 = z.array(z.string().min(1)).min(3).max(4);
const answerIndex = z.number().int().min(0).max(3);

export const QuestionSpec = z
  .discriminatedUnion("type", [
    QBase.extend({
      type: z.literal("mcq_meaning"),
      skin: z.enum(["flashcard", "slack"]).default("flashcard"),
      stem: z.string(),
      question: z.string(),
      options: options4,
      answer: answerIndex,
    }),
    QBase.extend({
      type: z.literal("fill_blank"),
      skin: z.enum(["slack", "jira", "vscode", "email", "pr"]).default("slack"),
      context: z.string().optional(),
      sentence: z.string().includes("___"),
      options: options4.optional(),
      answer: answerIndex.optional(),
      accepted: z.array(z.string()).optional(),
    }),
    QBase.extend({
      type: z.literal("sentence_order"),
      skin: z.enum(["terminal"]).default("terminal"),
      instruction: z.string().default("Sắp xếp các từ thành câu đúng"),
      sentence: z.string(),
      /** Optional explicit chunking ("|" separated) for phrases that must stay together. */
      chunks: z.array(z.string()).optional(),
    }),
    QBase.extend({
      type: z.literal("error_correction"),
      skin: z.enum(["gitlog", "slack", "email"]).default("gitlog"),
      sentence: z.string(),
      wrong: z.number().int().min(0),
      options: options4,
      answer: answerIndex,
    }),
    QBase.extend({
      type: z.literal("reply_choice"),
      skin: z.enum(["slack", "pr", "email"]).default("slack"),
      context: z
        .array(z.object({ speaker: z.string(), text: z.string() }))
        .min(1)
        .max(4),
      options: options4,
      answer: answerIndex,
    }),
    QBase.extend({
      type: z.literal("listening"),
      skin: z.enum(["zoom"]).default("zoom"),
      tts: z.string(),
      voice: z.enum(["en-US", "en-GB", "en-AU", "en-IN"]).default("en-US"),
      question: z.string(),
      /** Comprehension: options + answer. Dictation: no options, `accepted` transcripts instead. */
      options: options4.optional(),
      answer: answerIndex.optional(),
      accepted: z.array(z.string()).optional(),
      /** Meeting minutes: several speakers with their own voices, played in order (`tts` is ignored). */
      script: z
        .array(
          z.object({
            speaker: z.string(),
            voice: z.enum(["en-US", "en-GB", "en-AU", "en-IN"]),
            text: z.string(),
          }),
        )
        .min(2)
        .max(8)
        .optional(),
    }),
  ])
  .superRefine((q, ctx) => {
    if (
      "options" in q &&
      q.options &&
      "answer" in q &&
      q.answer !== undefined &&
      q.answer >= q.options.length
    ) {
      ctx.addIssue({ code: "custom", message: `${q.slug}: answer index out of range` });
    }
    if (q.type === "listening" && !(q.options && q.answer !== undefined) && !q.accepted?.length) {
      ctx.addIssue({
        code: "custom",
        message: `${q.slug}: listening needs options+answer or accepted (dictation)`,
      });
    }
    if (q.type === "fill_blank" && q.answer === undefined && !q.accepted?.length) {
      ctx.addIssue({
        code: "custom",
        message: `${q.slug}: fill_blank needs options+answer or accepted`,
      });
    }
    if (
      "options" in q &&
      q.options &&
      new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length
    ) {
      ctx.addIssue({ code: "custom", message: `${q.slug}: duplicate options` });
    }
    if (q.type === "error_correction" && q.wrong >= q.sentence.split(/\s+/).length) {
      ctx.addIssue({ code: "custom", message: `${q.slug}: wrong token index out of range` });
    }
  });
export type QuestionSpec = z.infer<typeof QuestionSpec>;
