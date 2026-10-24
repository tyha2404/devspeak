import { describe, expect, it } from "vitest";
import { DialogueSpec } from "@/features/content/curated";
import { advance, graphSenses, scoreSpeech, stripNode } from "./engine";

const spec = DialogueSpec.parse({
  slug: "t",
  npc: "sarah",
  title_en: "T",
  title_vi: "T",
  cefr: "A2",
  entry: "a",
  nodes: {
    a: { type: "line", en: "Any [[blockers|blocker-n]]?", next: "b" },
    b: {
      type: "choice",
      choices: [
        { id: "x", en: "No blockers.", quality: "best", feedback_vi: "Tốt", next: "q" },
        { id: "y", en: "I sleep.", quality: "poor", feedback_vi: "Lạc đề", next: "b" },
      ],
    },
    q: { type: "quiz", questions: ["q1", "q2"], passAt: 1, onPass: "end", onFail: "b" },
    end: { type: "end", effects: [{ type: "learnWord", sense: "standup-n" }] },
  },
});

describe("dialogue engine", () => {
  it("strips grading data from choices", () => {
    const n = stripNode("b", spec.nodes.b!);
    expect(JSON.stringify(n)).not.toMatch(/quality|feedback|next/);
  });

  it("walks lines, choices and quizzes", () => {
    expect(advance(spec, "a", {})).toMatchObject({ ok: true, next: "b" });
    expect(advance(spec, "b", { choiceId: "y" })).toMatchObject({
      ok: true,
      next: "b",
      feedback: { quality: "poor" },
    });
    expect(advance(spec, "b", { choiceId: "zzz" })).toEqual({ ok: false, error: "BAD_CHOICE" });
    expect(advance(spec, "q", { quiz: { finished: false, correct: 2 } })).toEqual({
      ok: false,
      error: "QUIZ_NOT_FINISHED",
    });
    expect(advance(spec, "q", { quiz: { finished: true, correct: 1 } })).toMatchObject({
      next: "end",
    });
    expect(advance(spec, "q", { quiz: { finished: true, correct: 0 } })).toMatchObject({
      next: "b",
    });
  });

  it("collects glossary senses from markup and effects", () => {
    expect(graphSenses(spec).sort()).toEqual(["blocker-n", "standup-n"]);
  });

  it("rejects graphs with dangling pointers or no single best choice", () => {
    const bad = {
      ...spec,
      nodes: { ...spec.nodes, a: { type: "line", en: "x", next: "nowhere" } },
    };
    expect(() => DialogueSpec.parse(bad)).toThrow(/missing node .*nowhere/);
  });
});

describe("scoreSpeech", () => {
  it("accepts inflections and reports missing ideas", () => {
    expect(
      scoreSpeech("Yesterday I fixed it. No blockers!", ["yesterday", "blocker", "today"]),
    ).toMatchObject({
      quality: "ok",
      missing: ["today"],
    });
    expect(scoreSpeech("unblock", ["block"]).hits).toEqual([]);
  });
});
