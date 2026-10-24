import type { ClientNode } from "@/lib/contracts/dialogue";
import { senseSlugs } from "@/lib/markup";
import type { DialogueNode, DialogueSpec, Effect } from "@/features/content/curated";

export type Graph = Pick<DialogueSpec, "entry" | "nodes">;

/** Remove grading data (quality, feedback, next pointers) before a node reaches the client. */
export function stripNode(
  id: string,
  node: DialogueNode,
  quiz?: { sessionId: string },
): ClientNode {
  switch (node.type) {
    case "line":
      return { id, type: "line", speaker: node.speaker, en: node.en, vi: node.vi };
    case "choice":
      return {
        id,
        type: "choice",
        promptEn: node.prompt_en,
        promptVi: node.prompt_vi,
        choices: node.choices.map((c) => ({ id: c.id, en: c.en, vi: c.vi })),
      };
    case "quiz":
      if (!quiz) throw new Error("quiz node needs a session");
      return {
        id,
        type: "quiz",
        introEn: node.intro_en,
        introVi: node.intro_vi,
        sessionId: quiz.sessionId,
        total: node.questions.length,
        passAt: node.passAt,
      };
    case "freewrite":
      return {
        id,
        type: "freewrite",
        taskEn: node.task_en,
        taskVi: node.task_vi,
        context: node.context,
      };
    case "speak":
      return {
        id,
        type: "speak",
        promptEn: node.prompt_en,
        promptVi: node.prompt_vi,
        phrases: node.expected,
      };
    case "end":
      return { id, type: "end" };
  }
}

/** Speaking: share of expected key phrases found in the transcript (punctuation-insensitive). */
export function scoreSpeech(transcript: string, expected: string[]) {
  const norm = (s: string) =>
    ` ${s
      .toLowerCase()
      .replace(/[^a-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()} `;
  const t = norm(transcript);
  // Match at a word start so inflections count ("blocker" ~ "blockers", "fix" ~ "fixed").
  const hits = expected.filter((p) => t.includes(` ${norm(p).trim()}`));
  const coverage = expected.length ? hits.length / expected.length : 0;
  const quality: "best" | "ok" | "poor" =
    coverage >= 0.75 ? "best" : coverage >= 0.4 ? "ok" : "poor";
  return { coverage, hits, missing: expected.filter((p) => !hits.includes(p)), quality };
}

export type AdvanceInput = {
  choiceId?: string;
  text?: string;
  quiz?: { finished: boolean; correct: number };
};

export type AdvanceResult =
  | {
      ok: true;
      next: string;
      feedback?: { quality: "best" | "ok" | "poor"; en?: string; vi: string };
      effects: Effect[];
    }
  | { ok: false; error: "BAD_CHOICE" | "QUIZ_NOT_FINISHED" | "ALREADY_DONE" | "TEXT_REQUIRED" };

/** Pure transition function: where does the run go from `current` given the learner's input? */
export function advance(graph: Graph, current: string, input: AdvanceInput): AdvanceResult {
  const node = graph.nodes[current];
  if (!node) throw new Error(`missing node ${current}`);
  switch (node.type) {
    case "line":
      return { ok: true, next: node.next, effects: node.effects };
    case "choice": {
      const c = node.choices.find((x) => x.id === input.choiceId);
      if (!c) return { ok: false, error: "BAD_CHOICE" };
      return {
        ok: true,
        next: c.next,
        feedback: { quality: c.quality, en: c.feedback_en, vi: c.feedback_vi },
        effects: [],
      };
    }
    case "quiz":
      if (!input.quiz?.finished) return { ok: false, error: "QUIZ_NOT_FINISHED" };
      return {
        ok: true,
        next: input.quiz.correct >= node.passAt ? node.onPass : node.onFail,
        effects: [],
      };
    case "freewrite":
    case "speak":
      // Grading happens in the service (AI or heuristics); the engine only checks input exists.
      if (!input.text?.trim()) return { ok: false, error: "TEXT_REQUIRED" };
      return { ok: true, next: node.next, effects: [] };
    case "end":
      return { ok: false, error: "ALREADY_DONE" };
  }
}

/** Every sense slug referenced by markup anywhere in the graph (for the glossary). */
export function graphSenses(graph: Graph): string[] {
  const out = new Set<string>();
  for (const n of Object.values(graph.nodes)) {
    const texts =
      n.type === "line"
        ? [n.en]
        : n.type === "choice"
          ? [n.prompt_en ?? "", ...n.choices.map((c) => c.en)]
          : n.type === "quiz"
            ? [n.intro_en ?? ""]
            : n.type === "freewrite"
              ? [n.task_en]
              : n.type === "speak"
                ? [n.prompt_en]
                : [];
    for (const t of texts) for (const s of senseSlugs(t)) out.add(s);
    if (n.type === "line" || n.type === "end")
      for (const e of n.effects) if (e.type === "learnWord") out.add(e.sense);
  }
  return [...out];
}
