import { describe, expect, it } from "vitest";
import { QuestionSpec } from "@/features/content/curated";
import { toQuestionRow } from "@/features/content/toQuestionRow";
import { buildClientPrompt } from "./deliver";
import { grade, revealAnswer, timeLimitSec } from "./grade";

const row = (q: unknown) => toQuestionRow(QuestionSpec.parse(q));
const base = { cefr: "A2", topic: "git", explanation_vi: "…" };

describe("delivery", () => {
  it("never leaks answer fields and uses opaque ids", () => {
    const { prompt } = row({
      ...base,
      slug: "q1",
      type: "mcq_meaning",
      stem: "x",
      question: "y",
      options: ["a", "b", "c", "d"],
      answer: 2,
    });
    const { client, optionMap } = buildClientPrompt(prompt);
    const json = JSON.stringify(client);
    expect(json).not.toMatch(/answer|correct|accepted|"o[0-3]"/);
    expect(Object.values(optionMap).sort()).toEqual(["o0", "o1", "o2", "o3"]);
  });

  it("always shuffles sentence_order tokens away from the solution", () => {
    const { prompt } = row({
      ...base,
      slug: "q2",
      type: "sentence_order",
      sentence: "I fixed the bug",
    });
    for (let i = 0; i < 20; i++) {
      const identity = () => 0.999; // a shuffle that keeps the order
      const { client, optionMap } = buildClientPrompt(prompt, identity);
      if (client.type !== "sentence_order") throw new Error();
      expect(client.tokens.map((t) => optionMap[t.id])).not.toEqual(["t0", "t1", "t2", "t3"]);
    }
  });
});

describe("grade", () => {
  it("grades choices through the opaque map", () => {
    const { prompt, answer } = row({
      ...base,
      slug: "q3",
      type: "reply_choice",
      context: [{ speaker: "Sarah", text: "hi" }],
      options: ["a", "b", "c"],
      answer: 1,
    });
    const { client, optionMap } = buildClientPrompt(prompt);
    if (client.type !== "reply_choice") throw new Error();
    const right = client.options.find((o) => optionMap[o.id] === "o1")!;
    const wrong = client.options.find((o) => optionMap[o.id] === "o0")!;
    expect(grade(prompt, answer, { kind: "choice", optionId: right.id }, optionMap)).toBe(true);
    expect(grade(prompt, answer, { kind: "choice", optionId: wrong.id }, optionMap)).toBe(false);
    expect(revealAnswer(answer, optionMap)).toEqual({ kind: "choice", optionId: right.id });
  });

  it("accepts typed answers with case, punctuation and one typo on long words", () => {
    const { prompt, answer } = row({
      ...base,
      slug: "q4",
      type: "fill_blank",
      sentence: "Please ___ first.",
      accepted: ["rebase"],
    });
    const g = (text: string) => grade(prompt, answer, { kind: "text", text }, {});
    expect(g("Rebase.")).toBe(true);
    expect(g("rebsae")).toBe(false); // two edits
    expect(g("rebas")).toBe(true); // one edit, 6+ letters
    expect(g("merge")).toBe(false);
  });

  it("grades sentence order by text so duplicate words are interchangeable", () => {
    const { prompt, answer } = row({
      ...base,
      slug: "q5",
      type: "sentence_order",
      sentence: "the test and the build",
    });
    const { client, optionMap } = buildClientPrompt(prompt);
    if (client.type !== "sentence_order") throw new Error();
    const byCanon = (c: string) => client.tokens.find((t) => optionMap[t.id] === c)!.id;
    const ok = ["t3", "t1", "t2", "t0", "t4"].map(byCanon); // swapped the two "the"
    expect(grade(prompt, answer, { kind: "order", tokenIds: ok }, optionMap)).toBe(true);
    const bad = ["t1", "t0", "t2", "t3", "t4"].map(byCanon);
    expect(grade(prompt, answer, { kind: "order", tokenIds: bad }, optionMap)).toBe(false);
    expect(grade(prompt, answer, { kind: "order", tokenIds: ok.slice(1) }, optionMap)).toBe(false);
  });

  it("requires both the wrong token and the right fix", () => {
    const { prompt, answer } = row({
      ...base,
      slug: "q6",
      type: "error_correction",
      sentence: "Fix bug when user login",
      wrong: 4,
      options: ["logs in", "logined", "log"],
      answer: 0,
    });
    const { client, optionMap } = buildClientPrompt(prompt);
    if (client.type !== "error_correction") throw new Error();
    const tok = (c: string) => client.tokens.find((t) => optionMap[t.id] === c)!.id;
    const opt = (c: string) => client.options.find((t) => optionMap[t.id] === c)!.id;
    expect(
      grade(prompt, answer, { kind: "fix", tokenId: tok("t4"), optionId: opt("o0") }, optionMap),
    ).toBe(true);
    expect(
      grade(prompt, answer, { kind: "fix", tokenId: tok("t0"), optionId: opt("o0") }, optionMap),
    ).toBe(false);
    expect(
      grade(prompt, answer, { kind: "fix", tokenId: tok("t4"), optionId: opt("o1") }, optionMap),
    ).toBe(false);
  });
});

describe("meeting minutes", () => {
  it("keeps the multi-speaker script and hides the key", () => {
    const { prompt, answer } = row({
      ...base,
      slug: "mm",
      type: "listening",
      tts: "",
      question: "q",
      script: [
        { speaker: "A", voice: "en-GB", text: "one" },
        { speaker: "B", voice: "en-US", text: "two" },
      ],
      options: ["x", "y", "z", "w"],
      answer: 1,
    });
    const { client } = buildClientPrompt(prompt);
    expect(client).toMatchObject({
      type: "listening",
      script: [{ speaker: "A" }, { speaker: "B" }],
    });
    expect(answer).toEqual({ kind: "choice", correct: "o1" });
    expect(JSON.stringify(client)).not.toContain('"o1"');
  });
});

describe("dictation with pre-generated audio", () => {
  it("sends only an audio URL, never the sentence", async () => {
    const { ttsKey } = await import("@/lib/ttsKey");
    const { audioManifest } = await import("./deliver");
    const { prompt } = row({
      ...base,
      slug: "dict",
      type: "listening",
      tts: "We rolled back the deploy.",
      voice: "en-US",
      question: "q",
      accepted: ["We rolled back the deploy"],
    });
    audioManifest().add(ttsKey("en-US", "We rolled back the deploy."));
    const { client } = buildClientPrompt(prompt);
    expect(client).toMatchObject({ type: "listening", dictation: true, tts: "" });
    expect(JSON.stringify(client)).not.toContain("rolled back");
    expect((client as { audio?: string }).audio).toMatch(/^\/audio\/[0-9a-f]{16}\.m4a$/);
  });
});

describe("timed sessions", () => {
  const typed = toQuestionRow(
    QuestionSpec.parse({
      slug: "t-typed",
      type: "fill_blank",
      cefr: "A1",
      topic: "grammar",
      sentence: "I ___ ready.",
      accepted: ["am"],
      explanation_vi: "x",
    }),
  );
  const choice = toQuestionRow(
    QuestionSpec.parse({
      slug: "t-choice",
      type: "fill_blank",
      cefr: "A1",
      topic: "grammar",
      sentence: "I ___ ready.",
      options: ["am", "is", "are"],
      answer: 0,
      explanation_vi: "x",
    }),
  );

  it("gives typed answers 30s and choices 20s", () => {
    expect(timeLimitSec(typed.prompt)).toBe(30);
    expect(timeLimitSec(choice.prompt)).toBe(20);
  });

  it("adds time for long prompts and high levels, capped", () => {
    const long = {
      ...choice.prompt,
      sentence: Array.from({ length: 30 }, () => "word").join(" "),
    } as typeof choice.prompt;
    // 30 + 3 option words = 33 words → 21 beyond 12 → +2s
    expect(timeLimitSec(long)).toBe(22);
    expect(timeLimitSec(choice.prompt, "B2")).toBe(25);
    expect(timeLimitSec(choice.prompt, "C1")).toBe(30);
    expect(timeLimitSec(typed.prompt, "C2")).toBe(40);
    const hugeSentence = Array.from({ length: 400 }, () => "w").join(" ");
    const huge = { ...long, sentence: hugeSentence } as typeof long;
    expect(timeLimitSec(huge, "C2")).toBe(45);
    expect(
      timeLimitSec({ ...typed.prompt, sentence: hugeSentence } as typeof typed.prompt, "C2"),
    ).toBe(60);
  });

  it("grades a timeout as wrong", () => {
    expect(grade(typed.prompt, typed.answer, { kind: "timeout" }, {})).toBe(false);
  });
});
