import { z } from "zod";

// What the generator returns for one target sense: a pack of 4–6 items of different types.
// Constraints the API's JSON Schema can't express (lengths, ranges) are re-checked by `validators.ts`.

const Base = {
  hint_vi: z
    .string()
    .describe("A short hint in Vietnamese that helps without giving the answer away"),
  explanation_vi: z.string().describe("Why the answer is right, in Vietnamese, max 2 sentences"),
};

export const GenQuestion = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq_meaning"),
    stem: z
      .string()
      .describe("An English sentence using the target word, wrapped as [[surface|SENSE_SLUG]]"),
    question: z.string(),
    options: z.array(z.string()).describe("4 Vietnamese meanings; exactly one correct"),
    answer: z.number().int(),
    ...Base,
  }),
  z.object({
    type: z.literal("fill_blank"),
    skin: z.enum(["slack", "jira", "vscode", "email"]),
    sentence: z
      .string()
      .describe("English sentence with exactly one ___ where a form of the target word goes"),
    options: z.array(z.string()).describe("4 English options of the same part of speech"),
    answer: z.number().int(),
    ...Base,
  }),
  z.object({
    type: z.literal("sentence_order"),
    sentence: z.string().describe("A 4–10 word English sentence using the target word"),
    ...Base,
  }),
  z.object({
    type: z.literal("error_correction"),
    sentence: z
      .string()
      .describe(
        "A sentence with exactly one grammar error (word form, tense, article, preposition)",
      ),
    wrong: z.number().int().describe("0-based index of the wrong token when splitting on spaces"),
    options: z
      .array(z.string())
      .describe("3 replacements for the wrong token; exactly one correct"),
    answer: z.number().int(),
    ...Base,
  }),
  z.object({
    type: z.literal("reply_choice"),
    context: z.array(z.object({ speaker: z.string(), text: z.string() })),
    options: z
      .array(z.string())
      .describe("3 replies: one appropriate, two that are too blunt/off-topic/wrong meaning"),
    answer: z.number().int(),
    ...Base,
  }),
  z.object({
    type: z.literal("listening"),
    tts: z.string().describe("1–2 sentences the NPC says aloud"),
    question: z.string(),
    options: z.array(z.string()).describe("4 English options; exactly one correct"),
    answer: z.number().int(),
    ...Base,
  }),
]);
export type GenQuestion = z.infer<typeof GenQuestion>;

export const ItemPack = z.object({ items: z.array(GenQuestion) });
export type ItemPack = z.infer<typeof ItemPack>;

/** Blind solve: the QA model answers without the key. */
export const BlindSolve = z.object({
  answer: z
    .number()
    .int()
    .describe("Index of the option you think is correct, or -1 if ambiguous/unsolvable"),
  confidence: z.enum(["high", "med", "low"]),
});

export const Rubric = z.object({
  solvable: z.boolean(),
  single_correct: z.boolean(),
  natural_english: z.boolean(),
  level_ok: z.boolean(),
  culturally_ok: z.boolean(),
  distractor_quality: z.number().int().describe("1 (bad) to 5 (excellent)"),
  vi_explanation_ok: z.boolean(),
  issues: z.array(z.string()),
});
export type Rubric = z.infer<typeof Rubric>;
