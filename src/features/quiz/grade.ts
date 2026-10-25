import type { QuizResponse, StoredAnswer, StoredPrompt } from "./types";

export function normalizeText(s: string) {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/**
 * Grade a response. `optionMap` maps the delivery's opaque ids back to canonical ids.
 * Typed answers tolerate one typo for words of 6+ letters.
 */
export function grade(
  prompt: StoredPrompt,
  answer: StoredAnswer,
  response: QuizResponse,
  optionMap: Record<string, string>,
): boolean {
  const real = (id: string) => optionMap[id];
  switch (answer.kind) {
    case "choice":
      return response.kind === "choice" && real(response.optionId) === answer.correct;
    case "text": {
      if (response.kind !== "text") return false;
      const got = normalizeText(response.text);
      return answer.accepted.some((a) => {
        const want = normalizeText(a);
        return got === want || (want.length >= 6 && levenshtein(got, want) <= 1);
      });
    }
    case "order": {
      if (response.kind !== "order" || prompt.type !== "sentence_order") return false;
      const ids = response.tokenIds.map(real);
      if (
        ids.some((id) => !id) ||
        new Set(ids).size !== ids.length ||
        ids.length !== prompt.tokens.length
      )
        return false;
      // Compare text, not ids: two identical words ("the ... the") are interchangeable.
      const text = ids.map((id) => prompt.tokens.find((t) => t.id === id)!.text).join(" ");
      return normalizeText(text) === normalizeText(answer.text);
    }
    case "fix":
      return (
        response.kind === "fix" &&
        real(response.tokenId) === answer.wrong &&
        real(response.optionId) === answer.correct
      );
  }
}

/** The correct answer expressed in the delivery's opaque ids, revealed after the final attempt. */
export function revealAnswer(answer: StoredAnswer, optionMap: Record<string, string>) {
  const opaque = (canonical: string) =>
    Object.entries(optionMap).find(([, v]) => v === canonical)?.[0];
  switch (answer.kind) {
    case "choice":
      return { kind: "choice" as const, optionId: opaque(answer.correct) };
    case "text":
      return { kind: "text" as const, text: answer.accepted[0] };
    case "order":
      return { kind: "order" as const, text: answer.text };
    case "fix":
      return {
        kind: "fix" as const,
        tokenId: opaque(answer.wrong),
        optionId: opaque(answer.correct),
      };
  }
}

function promptWords(prompt: StoredPrompt) {
  const texts: string[] = [];
  const walk = (v: unknown, key?: string) => {
    if (typeof v === "string") {
      if (key !== "skin" && key !== "id" && key !== "type" && key !== "voice" && key !== "speaker")
        texts.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(prompt);
  return texts.join(" ").split(/\s+/).filter(Boolean).length;
}

/**
 * Seconds a timed session allows per question: 20s for choices / 30s for typed answers,
 * +1s per 8 words beyond 12 (stem, sentence, options…), +5s at B2 and +10s at C1/C2,
 * capped at 45s / 60s.
 */
export function timeLimitSec(prompt: StoredPrompt, cefr?: string | null) {
  const typed = prompt.type === "fill_blank" && !prompt.options?.length;
  const base = typed ? 30 : 20;
  const cap = typed ? 60 : 45;
  const extraWords = Math.max(0, promptWords(prompt) - 12);
  const level = cefr === "B2" ? 5 : cefr === "C1" || cefr === "C2" ? 10 : 0;
  return Math.min(cap, base + Math.floor(extraWords / 8) + level);
}
