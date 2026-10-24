import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { mergeGuest } from "@/features/account/service";
import {
  completeLesson,
  finishPlacement,
  finishTestOut,
  gradeTask,
  home,
  loadPath,
  startCheckpoint,
  startLesson,
  startPlacement,
  startTestOut,
} from "@/features/curriculum/service";
import { reviewQueue, submitReview } from "@/features/srs/service";
import { admin, answerSession, newUser } from "./helpers";

beforeAll(() => {
  process.env.LLM_FAKE = "1";
});

const lessonId = async (slug: string) =>
  (await admin.from("lessons").select("id").eq("slug", slug).single()).data!.id as number;
const unitId = async (slug: string) =>
  (await admin.from("units").select("id").eq("slug", slug).single()).data!.id as number;
const xpOf = async (user: string) =>
  (await admin.from("profiles").select("xp_total").eq("id", user).single()).data!
    .xp_total as number;

/** Mark lessons done directly (fixtures for later steps; the real flow is tested separately). */
async function markDone(user: string, slugs: string[]) {
  for (const slug of slugs)
    await admin.from("user_lesson_progress").insert({
      user_id: user,
      lesson_id: await lessonId(slug),
      stars: 3,
      best_pct: 100,
      attempts: 1,
      completed_at: new Date().toISOString(),
    });
}

describe("lessons", () => {
  it("opens only the first lesson for a new learner", async () => {
    const user = await newUser();
    const path = await loadPath(admin, user);
    expect(path.next).toMatchObject({ type: "lesson", lessonId: await lessonId("s1-words") });
    await expect(startLesson(admin, user, await lessonId("s1-welcome"))).rejects.toMatchObject({
      code: "LOCKED",
    });
  });

  it("vocab lesson: adds cards, grades the quiz, pays XP once and opens the next lesson", async () => {
    const user = await newUser();
    const start = await startLesson(admin, user, await lessonId("s1-words"));
    expect(start.sessionId).toBeTruthy();
    // Starting again resumes the same run instead of creating a new quiz.
    expect((await startLesson(admin, user, await lessonId("s1-words"))).runId).toBe(start.runId);
    const { count: cards } = await admin
      .from("user_cards")
      .select("sense_id", { count: "exact", head: true })
      .eq("user_id", user);
    expect(cards).toBe(4);

    await expect(completeLesson(admin, user, start.runId)).rejects.toMatchObject({
      code: "QUIZ_NOT_FINISHED",
    });
    await answerSession(user, start.sessionId!, () => true);
    const r = await completeLesson(admin, user, start.runId);
    expect(r).toMatchObject({ passed: true, stars: 3, xp: 15, first: true, unitCompleted: false });
    expect(r.next?.lesson?.id).toBe(await lessonId("s1-welcome"));
    await completeLesson(admin, user, start.runId);
    // Answers inside lessons pay nothing; only the completion does, once.
    expect(await xpOf(user)).toBe(15);
  });

  it("a failed attempt records no progress", async () => {
    const user = await newUser();
    const start = await startLesson(admin, user, await lessonId("s1-words"));
    await answerSession(user, start.sessionId!, () => false);
    const r = await completeLesson(admin, user, start.runId);
    expect(r).toMatchObject({ passed: false, stars: 0, xp: 0 });
    expect((await loadPath(admin, user)).next?.lessonId).toBe(await lessonId("s1-words"));
  });

  it("a dialogue lesson needs the conversation finished", async () => {
    const user = await newUser();
    await markDone(user, ["s1-words"]);
    const start = await startLesson(admin, user, await lessonId("s1-welcome"));
    expect(start.dialogue?.node.type).toBe("line");
    await expect(completeLesson(admin, user, start.runId)).rejects.toMatchObject({
      code: "DIALOGUE_NOT_FINISHED",
    });
    await admin
      .from("dialogue_runs")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", start.dialogue!.runId);
    expect(await completeLesson(admin, user, start.runId)).toMatchObject({ passed: true, xp: 15 });
  });

  it("a task is graded, then completing it finishes the unit and moves to the next", async () => {
    const user = await newUser();
    await markDone(user, ["s1-words", "s1-welcome", "s1-focus", "s1-practice", "s1-mistakes"]);
    const start = await startLesson(admin, user, await lessonId("s1-task"));
    await expect(completeLesson(admin, user, start.runId)).rejects.toMatchObject({
      code: "TASK_NOT_GRADED",
    });
    const g = await gradeTask(
      admin,
      user,
      start.runId,
      "Hi everyone! I'm Nam, a backend developer. I work with Go and I'm on the payments team. Looking forward to working with you, thanks!",
    );
    expect(g.score).toBeGreaterThanOrEqual(2);
    expect(g.modelAnswer).toContain("Looking forward");
    const r = await completeLesson(admin, user, start.runId);
    expect(r).toMatchObject({ passed: true, xp: 30, unitCompleted: true });
    expect(r.next?.unit?.code).toBe("S2");
    expect((await home(admin, user, false)).next?.lesson?.id).toBe(await lessonId("s2-words"));
  });
});

describe("exams", () => {
  it("testing out completes a unit without lesson XP", async () => {
    const user = await newUser();
    const exam = await startTestOut(admin, user, await unitId("introduce-yourself"));
    expect(exam.total).toBe(8);
    await answerSession(user, exam.sessionId, () => true);
    const r = await finishTestOut(admin, user, exam.sessionId);
    expect(r).toMatchObject({ passed: true, pct: 100 });
    expect(r.next?.unit?.code).toBe("S2");
    expect(await xpOf(user)).toBe(0);
    // Units further down the path can't be tested out yet.
    await expect(startTestOut(admin, user, await unitId("work-email"))).rejects.toMatchObject({
      code: "LOCKED",
    });
  });

  it("does not offer a checkpoint while the stage still has units to finish", async () => {
    const user = await newUser();
    const { data: stage } = await admin
      .from("stages")
      .select("id")
      .eq("slug", "a2-foundation")
      .single();
    await expect(startCheckpoint(admin, user, stage!.id)).rejects.toMatchObject({ code: "LOCKED" });
  });

  it("placement puts a strong learner at the furthest published stage, once", async () => {
    const user = await newUser();
    const p = await startPlacement(admin, user);
    await answerSession(user, p.sessionId, () => true);
    const r = await finishPlacement(admin, user, p.sessionId);
    expect(r.band).toBe("B2");
    expect(r.unit.code).toBe("S7"); // stage 3 has no published units yet → start of stage 2
    const h = await home(admin, user, false);
    expect(h.next?.unit?.code).toBe("S7");
    expect(h.me.placementDone).toBe(true);
    await expect(startPlacement(admin, user)).rejects.toMatchObject({ code: "ALREADY_DONE" });
  });
});

describe("SRS review", () => {
  it("pays XP only for a verified, due review and is idempotent", async () => {
    const user = await newUser();
    await startLesson(admin, user, await lessonId("s1-words"));
    // Keep one card due, push the rest into the future.
    const { data: cards } = await admin.from("user_cards").select("sense_id").eq("user_id", user);
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    for (const c of cards!.slice(1))
      await admin
        .from("user_cards")
        .update({ due: future })
        .eq("user_id", user)
        .eq("sense_id", c.sense_id);
    const q = await reviewQueue(admin, user);
    expect(q.dueCount).toBe(1);
    const card = q.cards[0]!;

    // Self-rating alone: schedules but pays nothing.
    const id1 = crypto.randomUUID();
    const r1 = await submitReview(admin, user, { clientReviewId: id1, slug: card.slug, rating: 3 });
    expect(r1).toMatchObject({ xp: 0, verified: null });
    expect(
      await submitReview(admin, user, { clientReviewId: id1, slug: card.slug, rating: 3 }),
    ).toMatchObject({
      duplicate: true,
    });
    expect(await xpOf(user)).toBe(0);

    // A verified review on a due card earns 3 XP.
    await admin
      .from("user_cards")
      .update({ due: new Date(Date.now() - 1000).toISOString() })
      .eq("user_id", user)
      .eq("sense_id", cards![0]!.sense_id);
    const q2 = await reviewQueue(admin, user);
    await answerSession(user, q2.sessionId!, () => true);
    const { data: d } = await admin
      .from("question_deliveries")
      .select("id")
      .eq("session_id", q2.sessionId!)
      .single();
    const r2 = await submitReview(admin, user, {
      clientReviewId: crypto.randomUUID(),
      slug: card.slug,
      rating: 3,
      deliveryId: d!.id,
    });
    expect(r2).toMatchObject({ verified: true, xp: 3 });
  });
});

describe("guest merge", () => {
  it("moves a guest's XP, cards and lesson progress into the registered account", async () => {
    // A separate client: signing in on the shared admin client would replace its service-role session.
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: guest } = await anon.auth.signInAnonymously();
    const guestId = guest.user!.id;
    const start = await startLesson(admin, guestId, await lessonId("s1-words"));
    await answerSession(guestId, start.sessionId!, () => true);
    await completeLesson(admin, guestId, start.runId);

    const owner = await newUser();
    const r = await mergeGuest(admin, owner, guest.session!.access_token);
    expect(r).toMatchObject({ merged: true, cards: 4 });
    expect(await xpOf(owner)).toBe(15);
    expect((await loadPath(admin, owner)).next?.lessonId).toBe(await lessonId("s1-welcome"));
    const { data: gone } = await admin.auth.admin.getUserById(guestId);
    expect(gone.user).toBeNull();
  });
});
