import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { mergeGuest } from "@/features/account/service";
import { findLesson, findUnit } from "@/features/curriculum/path";
import {
  completeLesson,
  finishTestOut,
  home,
  loadPath,
  startLesson,
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
const stateOf = async (user: string, slug: string) =>
  findLesson(await loadPath(admin, user), await lessonId(slug))!.lesson.state;

describe("lessons", () => {
  it("opens the first grammar lesson and every vocabulary topic for a new learner", async () => {
    const user = await newUser();
    expect(await stateOf(user, "g-a1-be")).toBe("available");
    expect(await stateOf(user, "g-a1-present-simple")).toBe("locked");
    expect(await stateOf(user, "t02-l1")).toBe("available");
    await expect(
      startLesson(admin, user, await lessonId("g-a1-present-simple")),
    ).rejects.toMatchObject({ code: "LOCKED" });
    const h = await home(admin, user, false);
    expect(h.tracks.map((t) => t.next?.lesson.id)).toEqual(
      expect.arrayContaining([await lessonId("g-a1-be"), await lessonId("t01-l1")]),
    );
  });

  it("vocab lesson: adds cards, runs a strict 16-question test and pays full XP on first/improved passes and 30% on replays", async () => {
    const user = await newUser();
    const start = await startLesson(admin, user, await lessonId("t01-l1"));
    // Starting again resumes the same run instead of creating a new test.
    expect((await startLesson(admin, user, await lessonId("t01-l1"))).runId).toBe(start.runId);
    const { data: session } = await admin
      .from("quiz_sessions")
      .select("planned_count, max_attempts, time_limited")
      .eq("id", start.sessionId!)
      .single();
    expect(session).toEqual({ planned_count: 16, max_attempts: 1, time_limited: true });
    const { count: cards } = await admin
      .from("user_cards")
      .select("sense_id", { count: "exact", head: true })
      .eq("user_id", user);
    expect(cards).toBe(10);

    // 15/16 = 94% → 2 stars, 35 + 15 × 2 = 65 XP; the next lesson opens.
    await answerSession(user, start.sessionId!, (i) => i !== 0);
    // Push every card into the future so we can see which ones the mistake makes due again.
    const later = new Date(Date.now() + 10 * 86_400_000).toISOString();
    await admin.from("user_cards").update({ due: later }).eq("user_id", user);
    const r = await completeLesson(admin, user, start.runId);
    expect(r).toMatchObject({ passed: true, stars: 2, xp: 65, correct: 15, total: 16 });
    expect(r.next?.lesson.id).toBe(await lessonId("t01-l2"));
    expect(await stateOf(user, "t01-l2")).toBe("available");

    // The wrong answer's senses are due now in review; the others keep their future date.
    const { data: missed } = await admin
      .from("question_deliveries")
      .select("questions(sense_ids)")
      .eq("session_id", start.sessionId!)
      .eq("correct", false);
    const missedSenses = missed!.flatMap(
      (d) => (d.questions as unknown as { sense_ids: number[] }).sense_ids,
    );
    expect(missedSenses.length).toBeGreaterThan(0);
    const { data: due } = await admin
      .from("user_cards")
      .select("sense_id")
      .eq("user_id", user)
      .lte("due", new Date().toISOString());
    expect(new Set(due!.map((c) => c.sense_id))).toEqual(new Set(missedSenses));

    // A replay that improves the best star count pays in full.
    const again = await startLesson(admin, user, await lessonId("t01-l1"));
    await answerSession(user, again.sessionId!, () => true);
    expect(await completeLesson(admin, user, again.runId)).toMatchObject({ stars: 3, xp: 80 });
    expect(await xpOf(user)).toBe(145);

    // A replay without a better star count pays 30%: round(0.3 × 80) = 24.
    const third = await startLesson(admin, user, await lessonId("t01-l1"));
    await answerSession(user, third.sessionId!, () => true);
    expect(await completeLesson(admin, user, third.runId)).toMatchObject({ stars: 3, xp: 24 });
    expect(await xpOf(user)).toBe(169);
  }, 150_000);

  it("a failed test pays nothing and keeps the next lesson locked", async () => {
    const user = await newUser();
    const start = await startLesson(admin, user, await lessonId("g-a1-be"));
    await answerSession(user, start.sessionId!, (i) => i % 2 === 0);
    expect(await completeLesson(admin, user, start.runId)).toMatchObject({ passed: false, xp: 0 });
    expect(await stateOf(user, "g-a1-present-simple")).toBe("locked");
  });

  it("rotates all 36 words across three 16-question attempts and resumes open runs", async () => {
    const user = await newUser();
    try {
      const id = await lessonId("t20-l10");
      const { error } = await admin.from("user_unit_progress").insert({
        user_id: user,
        unit_id: await unitId("topic-energy"),
        via: "lessons",
      });
      if (error) throw error;
      const { data: bank, error: bankError } = await admin
        .from("lesson_questions")
        .select("question_id")
        .eq("lesson_id", id);
      if (bankError) throw bankError;
      expect(bank).toHaveLength(36);
      const covered = new Set<string>();
      let previous = new Set<string>();
      for (let attempt = 0; attempt < 3; attempt++) {
        const run = await startLesson(admin, user, id);
        expect(await startLesson(admin, user, id)).toEqual(run);
        const { data: session, error: sessionError } = await admin
          .from("quiz_sessions")
          .select("question_ids, planned_count")
          .eq("id", run.sessionId!)
          .single();
        if (sessionError) throw sessionError;
        expect(session.planned_count).toBe(16);
        const ids = session.question_ids as string[];
        expect(new Set(ids).size).toBe(16);
        if (attempt === 1) expect(ids.some((id) => previous.has(id))).toBe(false);
        ids.forEach((id) => covered.add(id));
        previous = new Set(ids);
        await answerSession(user, run.sessionId!, () => true);
        expect(await completeLesson(admin, user, run.runId)).toMatchObject({
          passed: true,
          correct: 16,
          total: 16,
        });
      }
      expect(covered).toEqual(new Set(bank!.map((row) => row.question_id)));
    } finally {
      await admin.auth.admin.deleteUser(user);
    }
  }, 90_000);
});

describe("level test-out", () => {
  it("upgrades lesson completion and opens every lesson in the next level", async () => {
    const user = await newUser();
    try {
      const a1 = await unitId("grammar-a1");
      const completedAt = "2026-01-01T00:00:00+00:00";
      const { error } = await admin.from("user_unit_progress").insert({
        user_id: user,
        unit_id: a1,
        via: "lessons",
        completed_at: completedAt,
      });
      if (error) throw error;
      const before = findUnit(await loadPath(admin, user), await unitId("grammar-a2"))!.unit;
      expect(before.lessons.some((lesson) => lesson.state === "locked")).toBe(true);
      const exam = await startTestOut(admin, user, a1);
      await answerSession(user, exam.sessionId, () => true);
      expect(await finishTestOut(admin, user, exam.sessionId)).toMatchObject({
        passed: true,
        xp: 120,
      });
      const path = await loadPath(admin, user);
      expect(findUnit(path, a1)!.unit.completedVia).toBe("test_out");
      expect(
        findUnit(path, await unitId("grammar-a2"))!.unit.lessons.every(
          (lesson) => lesson.state === "available",
        ),
      ).toBe(true);
      const { data: progress } = await admin
        .from("user_unit_progress")
        .select("completed_at")
        .eq("user_id", user)
        .eq("unit_id", a1)
        .single();
      expect(Date.parse(progress!.completed_at)).toBe(Date.parse(completedAt));
      expect(await finishTestOut(admin, user, exam.sessionId)).toMatchObject({ xp: 0 });
    } finally {
      await admin.auth.admin.deleteUser(user);
    }
  }, 60_000);

  it("80% opens every lesson of the level and the next one, and pays 120 XP", async () => {
    const user = await newUser();
    const a1 = await unitId("grammar-a1");
    const exam = await startTestOut(admin, user, a1);
    expect(exam.total).toBe(16);
    await answerSession(user, exam.sessionId, () => true);
    expect(await finishTestOut(admin, user, exam.sessionId)).toMatchObject({
      passed: true,
      xp: 120,
    });
    const path = await loadPath(admin, user);
    const a2 = findUnit(path, await unitId("grammar-a2"))!.unit;
    expect(a2.lessons.every((l) => l.state === "available")).toBe(true);
    expect(await stateOf(user, "g-a1-prepositions")).toBe("available");

    // Passing the same level's test-out again pays nothing.
    const again = await startTestOut(admin, user, a1);
    await answerSession(user, again.sessionId, () => true);
    expect(await finishTestOut(admin, user, again.sessionId)).toMatchObject({
      passed: true,
      xp: 0,
    });
  }, 60_000);
});

describe("SRS review", () => {
  it("pays XP only for a verified, due review and is idempotent", async () => {
    const user = await newUser();
    await startLesson(admin, user, await lessonId("t01-l1"));
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
    ).toMatchObject({ duplicate: true });
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
    const start = await startLesson(admin, guestId, await lessonId("t01-l1"));
    await answerSession(guestId, start.sessionId!, () => true);
    await completeLesson(admin, guestId, start.runId);

    const owner = await newUser();
    const r = await mergeGuest(admin, owner, guest.session!.access_token);
    expect(r).toMatchObject({ merged: true, cards: 10 });
    expect(await xpOf(owner)).toBe(80);
    expect(await stateOf(owner, "t01-l2")).toBe("available");
    const { count: answers } = await admin
      .from("user_answers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", owner);
    expect(answers).toBe(16);
    const { data: gone } = await admin.auth.admin.getUserById(guestId);
    expect(gone.user).toBeNull();
  });
});
