import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { BlindSolve, ItemPack, Rubric } from "./schema";

export const PROMPT_VERSION = "gen-pack@1";
export const QA_VERSION = "qa@1";

export const PERSONAS: Record<string, string> = {
  linh: "Linh, the HR manager. Warm, patient, bilingual. Topics: onboarding, introductions, leave, company rules.",
  tuan: "Tuấn, a senior Vietnamese developer and mentor. Practical and kind. Topics: git, pull requests, asking for help, code review basics.",
  sarah:
    "Sarah Chen, Scrum Master from Singapore. Organised, keeps meetings short. Topics: standups, sprints, estimates, deadlines, meetings.",
  dave: "Dave Miller, Australian designer. Chatty, uses light idioms. Topics: weekends, hobbies, coffee, small talk.",
  emma: "Emma Wilson, British QA engineer. Precise. Topics: bug reports, steps to reproduce, expected vs actual, severity, edge cases.",
  raj: "Raj Patel, Indian tech lead. Diplomatic reviewer. Topics: PR comments, architecture, trade-offs, hedging language.",
  kenji:
    "Kenji Sato, Japanese SRE. Calm and terse in incidents. Topics: incidents, on-call, logs, postmortems, passive voice.",
  robert:
    "Robert Hayes, the American CTO. Calm, thoughtful interviewer and speaker. Topics: interviews, performance reviews, presentations, leadership.",
  mentee:
    "An, a nervous but eager Vietnamese intern you mentor. Asks simple questions. Topics: git basics, pull requests, asking for help.",
  "attendee-a":
    "Priya, a friendly conference attendee from Bangalore. Topics: networking, what you work on, tech trends.",
  "attendee-b":
    "Lucas, a sharp British conference speaker. Asks tough but fair questions. Topics: architecture trade-offs.",
  mike: "Mike Johnson, American client product owner. Friendly but demanding. Topics: requirements, demos, scope, emails, deadlines.",
};

// Stable authoring rules: identical bytes on every request so the prefix caches.
const GENERATION_RULES = `You write English-learning exercises for Vietnamese software developers (CEFR A2–B2) inside a
pixel-art office game. Every item practises ONE target word sense in a realistic IT workplace situation.

Rules
- Sentence length: A2 ≤ 12 words, B1 ≤ 18, B2 ≤ 25. Use common words; the target may be harder.
- Mark the target in mcq stems as [[surface form|SENSE_SLUG]] using the slug you are given.
- Exactly one correct option. Distractors: same part of speech, similar length, plausible but clearly wrong,
  never a synonym or another form of the answer.
- mcq_meaning options are short Vietnamese meanings; other option lists are English.
- fill_blank: exactly one "___"; the answer must be a form of the target word.
- sentence_order: one natural sentence, 4–10 words, using the target.
- error_correction: exactly one error; "wrong" is the 0-based index when splitting the sentence on spaces.
- reply_choice: 1–2 context lines from the NPC; the correct reply is polite and professional.
- listening: what the NPC says aloud; the question tests understanding, not word matching.
- hint_vi helps without revealing the answer. explanation_vi: ≤ 2 sentences, friendly, in Vietnamese.
- No real company or product names, politics, religion, stereotypes, profanity or personal data.
- Produce 6 items: one of each type, in this order: mcq_meaning, fill_blank, sentence_order,
  error_correction, reply_choice, listening.

Example of a good mcq_meaning item:
{"type":"mcq_meaning","stem":"Any [[blockers|blocker-n]] today?","question":"A blocker is…",
 "options":["Vấn đề khiến bạn không làm tiếp được","Một loại bàn phím","Người quản lý dự án","Một ngày nghỉ"],
 "answer":0,"hint_vi":"Nghĩ về thứ chặn công việc của bạn.","explanation_vi":"Blocker là vướng mắc chặn công việc."}`;

export interface GenerationTarget {
  senseId: number;
  senseSlug: string;
  lemma: string;
  pos: string;
  definition: string;
  meaningVi: string;
  cefr: string;
  topic: string;
  npcId: string;
  forms: string[];
  variation: number;
}

export function generationRequest(
  model: string,
  t: GenerationTarget,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 16000,
    system: [
      { type: "text", text: GENERATION_RULES, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `NPC voice for these items: ${PERSONAS[t.npcId] ?? PERSONAS.tuan}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          `Target sense (scenario variation #${t.variation} of 5):\n` +
          `TARGET_JSON: ${JSON.stringify({
            slug: t.senseSlug,
            lemma: t.lemma,
            pos: t.pos,
            definition: t.definition,
            meaning_vi: t.meaningVi,
            cefr: t.cefr,
            topic: t.topic,
            allowed_forms: t.forms,
          })}`,
      },
    ],
    output_config: { format: zodOutputFormat(ItemPack), effort: "medium" },
  };
}

const QA_RULES = `You are checking an English-learning exercise for Vietnamese developers (CEFR A2–B2).`;

/** The item as the learner sees it: no answer key. */
export function blindSolveRequest(
  model: string,
  itemForLearner: unknown,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: `${QA_RULES} Solve it as a careful learner would. If more than one option is defensible, or none is, answer -1.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: `Exercise:\n${JSON.stringify(itemForLearner)}` }],
    output_config: { format: zodOutputFormat(BlindSolve), effort: "low" },
  };
}

export function rubricRequest(
  model: string,
  item: unknown,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: `${QA_RULES} Review the item including its answer key. Judge: is it solvable, is exactly one answer correct, is the English natural, is the level right, is it culturally appropriate, how good are the distractors (1-5), is the Vietnamese explanation correct. List concrete issues.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: `Item with key:\n${JSON.stringify(item)}` }],
    output_config: { format: zodOutputFormat(Rubric), effort: "low" },
  };
}

/** Pull the TARGET_JSON line back out of a generation request (used by the fake LLM). */
export function targetFromRequest(params: Anthropic.MessageCreateParamsNonStreaming) {
  const msg = params.messages[0];
  const text = typeof msg?.content === "string" ? msg.content : "";
  const line = text.split("\n").find((l) => l.startsWith("TARGET_JSON: "));
  return line ? (JSON.parse(line.slice("TARGET_JSON: ".length)) as Record<string, unknown>) : null;
}
