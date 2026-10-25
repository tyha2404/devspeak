import { describe, expect, it } from "vitest";
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
  const s = await createSession(admin, userId, { kind: "lesson", questionIds: ids });
  const d = await nextDelivery(admin, userId, s.id);
  if ("done" in d) throw new Error("unexpected done");
  return { session: s, delivery: d };
}

describe("quiz flow", () => {
  it("re-serves the same pending delivery and never includes the key", async () => {
    const user = await newUser();
    const { session, delivery } = await deliverOne(user, "g-a1-be-1");
    const again = await nextDelivery(admin, user, session.id);
    expect("deliveryId" in again && again.deliveryId).toBe(delivery.deliveryId);
    expect(JSON.stringify(delivery.prompt)).not.toMatch(/answer|correct/);
  });

  it("never serves an answered question again after a concurrent double delivery", async () => {
    const user = await newUser();
    const ids = await questionIdsBySlug(admin, ["g-a1-be-1", "g-a1-be-2"]);
    const s = await createSession(admin, user, { kind: "lesson", questionIds: ids });
    // Two parallel requests both find nothing pending and each deliver the first question.
    const [a] = await Promise.all([
      nextDelivery(admin, user, s.id),
      nextDelivery(admin, user, s.id),
    ]);
    if ("done" in a) throw new Error("unexpected done");
    await humanPause();
    await submitAnswer(admin, user, a.deliveryId, {
      kind: "choice",
      optionId: await correctChoice(a.deliveryId),
    });
    const next = await nextDelivery(admin, user, s.id);
    if ("done" in next) throw new Error("unexpected done");
    const { data } = await admin
      .from("question_deliveries")
      .select("question_id")
      .in("id", [a.deliveryId, next.deliveryId]);
    expect(new Set(data!.map((d) => d.question_id)).size).toBe(2);
    expect(next.index).toBe(2);
  });

  it("hints on the first miss, reveals on the second, and pays no XP", async () => {
    const user = await newUser();
    const { delivery } = await deliverOne(user, "g-a1-be-1");
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

  it("pays no XP per answer (the lesson pays) and rejects a double submit", async () => {
    const user = await newUser();
    const { delivery } = await deliverOne(user, "g-a1-be-2");
    const right = await correctChoice(delivery.deliveryId);
    await humanPause();
    const r = await submitAnswer(admin, user, delivery.deliveryId, {
      kind: "choice",
      optionId: right,
    });
    expect(r).toMatchObject({ final: true, correct: true, xp: 0 });
    await expect(
      submitAnswer(admin, user, delivery.deliveryId, { kind: "choice", optionId: right }),
    ).rejects.toBeInstanceOf(QuizError);
    const { data: p } = await admin.from("profiles").select("xp_total").eq("id", user).single();
    expect(p!.xp_total).toBe(0);
  });

  it("strict sessions give one attempt and a deadline per question", async () => {
    const user = await newUser();
    const ids = await questionIdsBySlug(admin, ["g-a1-be-1"]);
    const s = await createSession(admin, user, { kind: "lesson", questionIds: ids, strict: true });
    const d = await nextDelivery(admin, user, s.id);
    if ("done" in d) throw new Error("unexpected done");
    expect(d.timeLimitSec).toBe(20);
    expect(Date.parse(d.deadline!) - Date.now()).toBeGreaterThan(15_000);
    await humanPause();
    // A wrong first answer is final: no hint, no second try.
    const r = await submitAnswer(admin, user, d.deliveryId, { kind: "timeout" });
    expect(r).toMatchObject({ final: true, correct: false });
  });

  it("does not let one user answer another user's question", async () => {
    const owner = await newUser();
    const thief = await newUser();
    const { delivery } = await deliverOne(owner, "g-a1-be-5");
    await expect(
      submitAnswer(admin, thief, delivery.deliveryId, { kind: "choice", optionId: "x" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
