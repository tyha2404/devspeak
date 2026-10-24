import { z } from "zod";

// Authoring formats for hand-written content in content/curated/**.yaml.
// The seed script turns these into DB rows; AI-generated items use the same question shapes.

export const Cefr = z.enum(["A1", "A2", "B1", "B2", "C1"]);
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

// ----- dialogues -----
const L10n = { en: z.string(), vi: z.string().optional() };

export const Effect = z.discriminatedUnion("type", [
  z.object({ type: z.literal("learnWord"), sense: z.string() }),
  z.object({
    type: z.literal("setFlag"),
    flag: z.string(),
    value: z.union([z.boolean(), z.string(), z.number()]),
  }),
]);
export type Effect = z.infer<typeof Effect>;

export const DialogueNode = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("line"),
    speaker: z.enum(["npc", "player"]).default("npc"),
    ...L10n,
    next: z.string(),
    effects: z.array(Effect).default([]),
  }),
  z.object({
    type: z.literal("choice"),
    prompt_en: z.string().optional(),
    prompt_vi: z.string().optional(),
    choices: z
      .array(
        z.object({
          id: z.string(),
          ...L10n,
          quality: z.enum(["best", "ok", "poor"]),
          feedback_en: z.string().optional(),
          feedback_vi: z.string(),
          next: z.string(),
        }),
      )
      .min(2)
      .max(3),
  }),
  z.object({
    type: z.literal("quiz"),
    intro_en: z.string().optional(),
    intro_vi: z.string().optional(),
    questions: z.array(z.string()).min(1).max(10),
    passAt: z.number().int().min(1),
    onPass: z.string(),
    onFail: z.string(),
  }),
  z.object({
    type: z.literal("freewrite"),
    task_en: z.string(),
    task_vi: z.string(),
    context: z.array(z.object({ speaker: z.string(), text: z.string() })).default([]),
    keywords: z.array(z.string()).default([]),
    next: z.string(),
  }),
  z.object({
    type: z.literal("speak"),
    prompt_en: z.string(),
    prompt_vi: z.string(),
    expected: z.array(z.string()).min(1),
    next: z.string(),
  }),
  z.object({ type: z.literal("end"), effects: z.array(Effect).default([]) }),
]);
export type DialogueNode = z.infer<typeof DialogueNode>;

export const DialogueSpec = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    npc: NpcId,
    title_en: z.string(),
    title_vi: z.string(),
    cefr: Cefr,
    sort: z.number().int().default(0),
    unlock_level: z.number().int().default(1),
    xp: z.number().int().min(0).max(200).default(20),
    entry: z.string(),
    nodes: z.record(z.string(), DialogueNode),
  })
  .superRefine((d, ctx) => {
    const ids = new Set(Object.keys(d.nodes));
    const check = (id: string, from: string) => {
      if (!ids.has(id))
        ctx.addIssue({
          code: "custom",
          message: `${d.slug}: ${from} points to missing node "${id}"`,
        });
    };
    check(d.entry, "entry");
    for (const [id, n] of Object.entries(d.nodes)) {
      if (n.type === "line" || n.type === "freewrite" || n.type === "speak") check(n.next, id);
      if (n.type === "choice") {
        n.choices.forEach((c) => check(c.next, `${id}.${c.id}`));
        if (n.choices.filter((c) => c.quality === "best").length !== 1) {
          ctx.addIssue({
            code: "custom",
            message: `${d.slug}: choice ${id} needs exactly one "best"`,
          });
        }
      }
      if (n.type === "quiz") {
        check(n.onPass, `${id}.onPass`);
        check(n.onFail, `${id}.onFail`);
        if (n.passAt > n.questions.length)
          ctx.addIssue({ code: "custom", message: `${d.slug}: ${id} passAt > questions` });
      }
    }
    if (!Object.values(d.nodes).some((n) => n.type === "end")) {
      ctx.addIssue({ code: "custom", message: `${d.slug}: no end node` });
    }
  });
export type DialogueSpec = z.infer<typeof DialogueSpec>;
