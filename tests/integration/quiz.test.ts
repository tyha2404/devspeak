import { describe, expect, it } from "vitest";
import { advanceDialogue, startDialogue } from "@/features/dialogue/service";
import {
  createSession,
  nextDelivery,
  questionIdsBySlug,
  submitAnswer,
  QuizError,
} from "@/features/quiz/service";
import type { ClientPrompt } from "@/features/quiz/deliver";
import { admin, humanPause, newUser } from "./helpers";

/** Find the correct option by asking the server-only map (tests only). */
async function correctChoice(deliveryId: string) {
  const { data } = await admin
    .from("question_deliveries")
    .select("option_map, question_versions(answer)")
    .eq("id", deliveryId)
    .single();
  const map = data!.option_map as Record<string, string>;
  const answer = (data!.question_versions as unknown as { answer: { correct: string } }).answer;
  return Object.entries(map).find(([, v]) => v === answer.correct)![0];
}

async function deliverOne(userId: string, slug: string) {
  const ids = await questionIdsBySlug(admin, [slug]);
  const s = await createSession(admin, userId, { kind: "npc", questionIds: ids });
  const d = await nextDelivery(admin, userId, s.id);
  if ("done" in d) throw new Error("unexpected done");
  return { session: s, delivery: d };
}

describe("quiz flow", () => {
  it("re-serves the same pending delivery and never includes the key", async () => {
    const user = await newUser();
    const { session, delivery } = await deliverOne(user, "sarah-blocker-meaning");
    const again = await nextDelivery(admin, user, session.id);
    expect("deliveryId" in again && again.deliveryId).toBe(delivery.deliveryId);
    expect(JSON.stringify(delivery.prompt)).not.toMatch(/answer|correct/);
  });

  it("hints on the first miss, reveals on the second, and pays no XP", async () => {
    const user = await newUser();
    const { delivery } = await deliverOne(user, "sarah-blocker-meaning");
    const right = await correctChoice(delivery.deliveryId);
    const wrong = (delivery.prompt as Extract<ClientPrompt, { type: "mcq_meaning" }>).options.find(
      (o) => o.id !== right,
    )!.id;
    await humanPause();
    const first = await submitAnswer(admin, user, delivery.deliveryId, {
      kind: "choice",
      optionId: wrong,
    });
    expect(first).toMatchObject({ final: false, attempt: 1 });
    expect(JSON.stringify(first)).not.toContain(right);
    const second = await submitAnswer(admin, user, delivery.deliveryId, {
      kind: "choice",
      optionId: wrong,
    });
    expect(second).toMatchObject({
      final: true,
      correct: false,
      xp: 0,
      answer: { optionId: right },
    });
  });

  it("awards 10 XP once and rejects a double submit", async () => {
    const user = await newUser();
    const { delivery } = await deliverOne(user, "sarah-standup-meaning");
    const right = await correctChoice(delivery.deliveryId);
    await humanPause();
    const r = await submitAnswer(admin, user, delivery.deliveryId, {
      kind: "choice",
      optionId: right,
    });
    expect(r).toMatchObject({ final: true, correct: true, xp: 10 });
    await expect(
      submitAnswer(admin, user, delivery.deliveryId, { kind: "choice", optionId: right }),
    ).rejects.toBeInstanceOf(QuizError);
    const { data: p } = await admin
      .from("profiles")
      .select("xp_total, coins")
      .eq("id", user)
      .single();
    // 10 for the answer + 30..50 completion bonus for the one-question session.
    expect(p!.xp_total).toBeGreaterThanOrEqual(40);
  });

  it("pays nothing for answers faster than a human can read", async () => {
    const user = await newUser();
    const { delivery } = await deliverOne(user, "sarah-sprint-meaning");
    const right = await correctChoice(delivery.deliveryId);
    const r = await submitAnswer(admin, user, delivery.deliveryId, {
      kind: "choice",
      optionId: right,
    });
    expect(r).toMatchObject({ correct: true, xp: 0 });
  });

  it("does not let one user answer another user's question", async () => {
    const owner = await newUser();
    const thief = await newUser();
    const { delivery } = await deliverOne(owner, "sarah-deadline-meaning");
    await expect(
      submitAnswer(admin, thief, delivery.deliveryId, { kind: "choice", optionId: "x" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("dialogue flow", () => {
  it("walks Linh's welcome end to end, learns words and pays XP once", async () => {
    const user = await newUser();
    let step = await startDialogue(admin, user, "linh", 1);
    expect(step.node).toMatchObject({ type: "line" });
    expect(Object.keys(step.glossary)).toContain("onboarding-n");

    step = await advanceDialogue(admin, user, step.runId); // hello → choice
    expect(step.node.type).toBe("choice");
    const poor = await advanceDialogue(admin, user, step.runId, "b");
    expect(poor.feedback?.quality).toBe("poor");
    step = await advanceDialogue(admin, user, step.runId, "a"); // best → thanks
    expect(step.feedback?.quality).toBe("best");
    step = await advanceDialogue(admin, user, step.runId); // thanks → quiz
    if (step.node.type !== "quiz") throw new Error("expected quiz");
    await expect(advanceDialogue(admin, user, step.runId)).rejects.toMatchObject({
      code: "QUIZ_NOT_FINISHED",
    });

    const sessionId = step.node.sessionId;
    for (;;) {
      const d = await nextDelivery(admin, user, sessionId);
      if ("done" in d) break;
      await humanPause();
      const prompt = d.prompt;
      if (prompt.type === "fill_blank" || prompt.type === "mcq_meaning") {
        await submitAnswer(admin, user, d.deliveryId, {
          kind: "choice",
          optionId: await correctChoice(d.deliveryId),
        });
      } else throw new Error(`unexpected ${prompt.type}`);
    }
    step = await advanceDialogue(admin, user, step.runId); // quiz → done (passed)
    expect(step.node.type).toBe("line");
    step = await advanceDialogue(admin, user, step.runId); // done → end
    expect(step.done).toBe(true);
    expect(step.rewards?.xp).toBe(20);
    expect(step.rewards?.wordsLearned.sort()).toEqual(["colleague-n", "onboarding-n"]);

    // Replaying pays no dialogue XP again.
    const replay = await startDialogue(admin, user, "linh", 1);
    expect(replay.title.en).toBe("Asking for a day off");
  });
});
