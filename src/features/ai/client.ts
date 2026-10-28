import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { GeminiLlm } from "./gemini";
import { AnthropicLlm, FakeLlm, type LlmClient } from "./llm";
import { targetFromRequest } from "./prompts";
import type { ItemPack } from "./schema";

/** A plausible, valid item pack built from the target — lets the pipeline run end to end offline. */
export function fakeGenerate(params: Anthropic.MessageCreateParamsNonStreaming): unknown {
  const t = targetFromRequest(params);
  const sys = JSON.stringify(params.system ?? "");
  if (!t) {
    if (sys.includes("non-player character")) return fakeChat(params);
    if (sys.includes("Solve it as a careful learner")) return { answer: 0, confidence: "high" };
    if (sys.includes("Grade the learner's written reply")) {
      return {
        score: 2,
        tone_ok: true,
        grammar_fixes: [],
        feedback_vi: "Tốt! Câu trả lời rõ ràng và lịch sự.",
        better_version: "",
      };
    }
    return {
      solvable: true,
      single_correct: true,
      natural_english: true,
      level_ok: true,
      culturally_ok: true,
      distractor_quality: 4,
      vi_explanation_ok: true,
      issues: [],
    };
  }
  const lemma = String(t.lemma);
  // Vary output per call like a real model would, so repeated fake runs don't collide on content hashes.
  const tag = Math.random().toString(36).slice(2, 6);
  const slug = String(t.slug);
  const forms = (t.allowed_forms as string[]) ?? [lemma.toLowerCase()];
  const word = forms[0] ?? lemma.toLowerCase();
  const pack: ItemPack = {
    items: [
      {
        type: "mcq_meaning",
        stem: `Today we talked about the [[${lemma}|${slug}]] in team ${tag}.`,
        question: `What does "${lemma}" mean here?`,
        options: [String(t.meaning_vi), "Một loại máy in", "Một ngày nghỉ lễ", "Một quán cà phê"],
        answer: 0,
        hint_vi: "Đọc kỹ ngữ cảnh công việc.",
        explanation_vi: `"${lemma}" nghĩa là ${String(t.meaning_vi)}.`,
      },
      {
        type: "sentence_order",
        sentence: `We need the ${word} for task ${tag}`,
        hint_vi: "Bắt đầu bằng chủ ngữ.",
        explanation_vi: "Chủ ngữ + động từ + tân ngữ.",
      },
      {
        type: "reply_choice",
        context: [{ speaker: "Sarah", text: `Can you tell me more about the ${word} (${tag})?` }],
        options: [
          "Sure, let me explain it after standup.",
          "No.",
          "Ask someone else, I'm busy forever.",
        ],
        answer: 0,
        hint_vi: "Chọn câu lịch sự nhất.",
        explanation_vi: "Đồng ý và hẹn thời gian là cách trả lời chuyên nghiệp.",
      },
    ],
  };
  return pack;
}

/** Offline stand-in for NPC chat: echoes politely and flags obvious jailbreak attempts. */
function fakeChat(params: Anthropic.MessageCreateParamsNonStreaming) {
  const last = params.messages[params.messages.length - 1];
  const text =
    typeof last?.content === "string" ? last.content.replace(/<\/?learner_message>/g, "") : "";
  const breakAttempt = /ignore (all|previous)|system prompt/i.test(text);
  const words = text.trim().split(/\s+/).length;
  return {
    npc_reply: breakAttempt
      ? "Nice try! Let's get back to the sprint. What are you working on?"
      : `Thanks for sharing! You said: "${text.slice(0, 60)}". Can you tell me more?`,
    correction: /\bi has\b/i.test(text)
      ? {
          original: "I has",
          corrected: "I have",
          explanation_vi: "Chủ ngữ I đi với have.",
          error_type: "agreement",
          severity: "major",
        }
      : null,
    target_words_used: [],
    goal_progress: Math.min(3, Math.floor(words / 5)),
    goal_met: false,
    off_topic: false,
    break_attempt: breakAttempt,
    learner_used_vietnamese: /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text),
  };
}

let cached: LlmClient | undefined;

/**
 * A real model only when explicitly enabled (LLM_FAKE=0) and the provider's key is present: shells often
 * carry an unrelated API key, and local dev/CI must never spend money by accident.
 * `LLM_PROVIDER=gemini` switches to Google AI Studio (GEMINI_API_KEY); default is Claude.
 */
export function getLlm(): LlmClient {
  if (cached) return cached;
  if (llmIsFake()) {
    cached = new FakeLlm(fakeGenerate);
  } else {
    cached =
      llmProvider() === "gemini"
        ? new GeminiLlm(process.env.GEMINI_API_KEY, {
            free: process.env.GEMINI_FREE_TIER === "1",
            rpm: Number(process.env.GEMINI_RPM) || undefined,
          })
        : new AnthropicLlm(process.env.ANTHROPIC_API_KEY);
  }
  return cached;
}

export function llmIsFake() {
  const key =
    llmProvider() === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY;
  return process.env.LLM_FAKE !== "0" || !key;
}

export function llmProvider(): "anthropic" | "gemini" {
  return process.env.LLM_PROVIDER === "gemini" ? "gemini" : "anthropic";
}
