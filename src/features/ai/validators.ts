import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";
import { QuestionSpec } from "@/features/content/curated";
import { splitTokens, toQuestionRow } from "@/features/content/toQuestionRow";
import { senseSlugs, stripMarkup } from "@/lib/markup";
import type { GenQuestion } from "./schema";

const profanity = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});
const VI_BANNED = ["địt", "đụ", "lồn", "cặc", "đéo", "đm", "vcl", "vkl"];

const MAX_WORDS: Record<string, number> = { A1: 10, A2: 12, B1: 18, B2: 25, C1: 30 };
/** Share of tokens that must be "known" (common list + target forms) per level. */
const COVERAGE: Record<string, number> = { A1: 0.95, A2: 0.95, B1: 0.93, B2: 0.92, C1: 0.9 };

export interface ValidationContext {
  senseSlug: string;
  cefr: string;
  npcId: string;
  topic: string;
  /** Lowercased lemma + inflected forms of the target. */
  forms: string[];
  /** Common-word list for the level check; empty disables the check (flagged in the report). */
  commonWords: Set<string>;
}

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const words = (s: string) =>
  stripMarkup(s)
    .toLowerCase()
    .replace(/[^a-z' -]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const containsForm = (text: string, forms: string[]) => {
  const t = ` ${stripMarkup(text)
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, " ")} `;
  return forms.some((f) => t.includes(` ${f} `));
};

const englishText = (q: GenQuestion): string[] => {
  switch (q.type) {
    case "mcq_meaning":
      return [q.stem, q.question];
    case "fill_blank":
      return [q.sentence.replace("___", "x"), ...q.options];
    case "sentence_order":
      return [q.sentence];
    case "error_correction":
      return [q.sentence, ...q.options];
    case "reply_choice":
      return [...q.context.map((c) => c.text), ...q.options];
    case "listening":
      return [q.tts, q.question, ...q.options];
  }
};

/** Deterministic checks for one generated item. Errors reject it; warnings send it to review. */
export function validateGenerated(q: GenQuestion, ctx: ValidationContext): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if ("options" in q) {
    const n = q.options.length;
    const want = q.type === "error_correction" || q.type === "reply_choice" ? 3 : 4;
    if (n < 3 || n > 4) errors.push(`expected ${want} options, got ${n}`);
    if (q.answer < 0 || q.answer >= n) errors.push("answer index out of range");
    const norm = q.options.map((o) => o.trim().toLowerCase());
    if (new Set(norm).size !== norm.length) errors.push("duplicate options");
    if (q.type !== "mcq_meaning") {
      // Distractors must not be forms of the answer (two right answers).
      const right = norm[q.answer] ?? "";
      if (
        q.type === "fill_blank" &&
        norm.some((o, i) => i !== q.answer && ctx.forms.includes(o) && ctx.forms.includes(right))
      ) {
        errors.push("a distractor is another form of the target");
      }
      const lens = q.options.map((o) => o.length);
      const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
      if (q.type !== "reply_choice" && lens.some((l) => l > avg * 2.2 || l < avg * 0.35))
        warnings.push("option lengths uneven");
    }
  }

  switch (q.type) {
    case "mcq_meaning":
      if (!senseSlugs(q.stem).includes(ctx.senseSlug))
        errors.push("stem does not mark the target sense");
      break;
    case "fill_blank":
      if (q.sentence.split("___").length !== 2) errors.push("fill_blank needs exactly one ___");
      if (!ctx.forms.includes(q.options[q.answer]?.trim().toLowerCase() ?? ""))
        errors.push("answer is not a form of the target");
      break;
    case "sentence_order": {
      const n = splitTokens(q.sentence).length;
      if (n < 4 || n > 10) errors.push(`sentence_order needs 4–10 words, got ${n}`);
      if (!containsForm(q.sentence, ctx.forms)) errors.push("target word missing");
      break;
    }
    case "error_correction": {
      const toks = splitTokens(q.sentence);
      if (q.wrong < 0 || q.wrong >= toks.length) errors.push("wrong-token index out of range");
      else if (q.options.some((o) => o.trim().toLowerCase() === toks[q.wrong]!.toLowerCase())) {
        errors.push("an option repeats the wrong token");
      }
      break;
    }
    case "reply_choice":
      if (q.context.length < 1 || q.context.length > 4)
        errors.push("reply_choice needs 1–4 context lines");
      break;
    case "listening":
      if (!containsForm(q.tts, ctx.forms)) warnings.push("listening text does not use the target");
      break;
  }

  // Level: sentence length + vocabulary coverage.
  const main = englishText(q)[0] ?? "";
  if (words(main).length > (MAX_WORDS[ctx.cefr] ?? 25))
    warnings.push("sentence too long for level");
  if (ctx.commonWords.size) {
    const toks = englishText(q).flatMap(words);
    const known = toks.filter(
      (w) =>
        ctx.commonWords.has(w) ||
        ctx.forms.includes(w) ||
        ctx.commonWords.has(w.replace(/(s|es|ed|ing)$/, "")),
    );
    if (toks.length && known.length / toks.length < (COVERAGE[ctx.cefr] ?? 0.9))
      warnings.push("vocabulary above level");
  } else warnings.push("coverage_unchecked");

  // Safety.
  const allText = [
    ...englishText(q),
    q.explanation_vi,
    q.hint_vi,
    "options" in q ? q.options.join(" ") : "",
  ].join(" ");
  if (profanity.hasMatch(allText) || VI_BANNED.some((b) => allText.toLowerCase().includes(b)))
    errors.push("profanity");

  // Structural round-trip through the curated schema (also re-checks option/answer invariants).
  const spec = toSpec(q, ctx, "validate");
  const parsed = QuestionSpec.safeParse(spec);
  if (!parsed.success)
    errors.push(`schema: ${parsed.error.issues.map((i) => i.message).join("; ")}`);

  return { ok: errors.length === 0, errors, warnings };
}

/** Convert a generated item into the curated question shape (adds slug/level/NPC/topic/sense). */
export function toSpec(
  q: GenQuestion,
  ctx: Pick<ValidationContext, "senseSlug" | "cefr" | "npcId" | "topic">,
  slug: string,
) {
  const base = {
    slug,
    cefr: ctx.cefr,
    npc: ctx.npcId,
    topic: ctx.topic,
    senses: [ctx.senseSlug],
    hint_vi: q.hint_vi,
    explanation_vi: q.explanation_vi,
  };
  switch (q.type) {
    case "mcq_meaning":
      return {
        ...base,
        type: q.type,
        skin: "flashcard",
        stem: q.stem,
        question: q.question,
        options: q.options,
        answer: q.answer,
      };
    case "fill_blank":
      return {
        ...base,
        type: q.type,
        skin: q.skin,
        sentence: q.sentence,
        options: q.options,
        answer: q.answer,
      };
    case "sentence_order":
      return { ...base, type: q.type, sentence: q.sentence };
    case "error_correction":
      return {
        ...base,
        type: q.type,
        skin: "gitlog",
        sentence: q.sentence,
        wrong: q.wrong,
        options: q.options,
        answer: q.answer,
      };
    case "reply_choice":
      return {
        ...base,
        type: q.type,
        skin: "slack",
        context: q.context,
        options: q.options,
        answer: q.answer,
      };
    case "listening":
      return {
        ...base,
        type: q.type,
        tts: q.tts,
        question: q.question,
        options: q.options,
        answer: q.answer,
      };
  }
}

export function toRow(
  q: GenQuestion,
  ctx: Pick<ValidationContext, "senseSlug" | "cefr" | "npcId" | "topic">,
  slug: string,
) {
  return toQuestionRow(QuestionSpec.parse(toSpec(q, ctx, slug)));
}
