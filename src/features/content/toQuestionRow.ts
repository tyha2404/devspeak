import { createHash } from "node:crypto";
import type { StoredAnswer, StoredPrompt } from "@/features/quiz/types";
import type { QuestionSpec } from "./curated";

const opts = (texts: string[]) => texts.map((text, i) => ({ id: `o${i}`, text }));
const toks = (texts: string[]) => texts.map((text, i) => ({ id: `t${i}`, text }));

export const splitTokens = (sentence: string) => sentence.trim().split(/\s+/);

/** Convert an authored/generated question into the stored prompt + server-only answer key. */
export function toQuestionRow(q: QuestionSpec): {
  prompt: StoredPrompt;
  answer: StoredAnswer;
  contentHash: string;
} {
  let prompt: StoredPrompt;
  let answer: StoredAnswer;
  switch (q.type) {
    case "mcq_meaning":
      prompt = {
        type: q.type,
        skin: q.skin,
        stem: q.stem,
        question: q.question,
        options: opts(q.options),
      };
      answer = { kind: "choice", correct: `o${q.answer}` };
      break;
    case "fill_blank":
      prompt = {
        type: q.type,
        skin: q.skin,
        context: q.context,
        sentence: q.sentence,
        options: q.options && opts(q.options),
      };
      answer =
        q.options && q.answer !== undefined
          ? { kind: "choice", correct: `o${q.answer}` }
          : { kind: "text", accepted: q.accepted! };
      break;
    case "sentence_order": {
      const chunks = q.chunks ?? splitTokens(q.sentence);
      prompt = { type: q.type, skin: q.skin, instruction: q.instruction, tokens: toks(chunks) };
      answer = { kind: "order", text: chunks.join(" ") };
      break;
    }
    case "error_correction":
      prompt = {
        type: q.type,
        skin: q.skin,
        tokens: toks(splitTokens(q.sentence)),
        options: opts(q.options),
      };
      answer = { kind: "fix", wrong: `t${q.wrong}`, correct: `o${q.answer}` };
      break;
    case "reply_choice":
      prompt = { type: q.type, skin: q.skin, context: q.context, options: opts(q.options) };
      answer = { kind: "choice", correct: `o${q.answer}` };
      break;
    case "listening":
      if (q.options && q.answer !== undefined) {
        prompt = {
          type: q.type,
          skin: q.skin,
          tts: q.tts,
          voice: q.voice,
          question: q.question,
          options: opts(q.options),
          ...(q.script ? { script: q.script } : {}),
        };
        answer = { kind: "choice", correct: `o${q.answer}` };
      } else {
        // Dictation: the learner types what they hear.
        prompt = {
          type: q.type,
          skin: q.skin,
          tts: q.tts,
          voice: q.voice,
          question: q.question,
          options: [],
          dictation: true,
        };
        answer = { kind: "text", accepted: q.accepted! };
      }
      break;
  }
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ t: q.type, p: normalizeForHash(prompt), a: answer }))
    .digest("hex");
  return { prompt, answer, contentHash };
}

function normalizeForHash(p: StoredPrompt) {
  return JSON.stringify(p).toLowerCase().replace(/\s+/g, " ");
}
