import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { glossary } from "@/features/content/glossary";
import { createSession } from "@/features/quiz/service";
import {
  previewIntervals,
  schedule,
  verificationTypes,
  type DbCard,
  type UiRating,
} from "./scheduler";

const CARD_COLS =
  "sense_id, state, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review";

/**
 * Due cards for review. Each card gets a server-graded verification question (picked by memory
 * strength) bundled in one `review_verify` session; self-ratings alone never earn XP.
 */
export async function reviewQueue(db: SupabaseClient, userId: string, limit = 20) {
  const now = new Date();
  const { data: cards } = await db
    .from("user_cards")
    .select(CARD_COLS)
    .eq("user_id", userId)
    .lte("due", now.toISOString())
    .order("due")
    .limit(limit);
  const { count: total } = await db
    .from("user_cards")
    .select("sense_id", { count: "exact", head: true })
    .eq("user_id", userId);
  const list = (cards ?? []) as (DbCard & { sense_id: number })[];
  if (!list.length) return { cards: [], dueCount: 0, total: total ?? 0, sessionId: null };

  const { data: qs } = await db
    .from("questions")
    .select("id, type, sense_ids")
    .eq("status", "published")
    .overlaps(
      "sense_ids",
      list.map((c) => c.sense_id),
    );
  const verification = new Map<number, string>();
  for (const c of list) {
    const pool = (qs ?? []).filter((q) => (q.sense_ids as number[]).includes(c.sense_id));
    const preferred = verificationTypes(c.stability);
    const q =
      pool.find((x) => preferred.includes(x.type as string)) ??
      pool[Math.floor(Math.random() * pool.length)];
    if (q) verification.set(c.sense_id, q.id as string);
  }
  const ordered = list.filter((c) => verification.has(c.sense_id));
  const session = ordered.length
    ? await createSession(db, userId, {
        kind: "review_verify",
        questionIds: ordered.map((c) => verification.get(c.sense_id)!),
      })
    : null;

  const { data: slugs } = await db
    .from("senses")
    .select("id, slug")
    .in(
      "id",
      list.map((c) => c.sense_id),
    );
  const slugOf = new Map((slugs ?? []).map((s) => [s.id as number, s.slug as string]));
  const gloss = await glossary(db, [...slugOf.values()]);
  return {
    sessionId: session?.id ?? null,
    dueCount: list.length,
    total: total ?? 0,
    cards: list.map((c) => ({
      slug: slugOf.get(c.sense_id)!,
      word: gloss[slugOf.get(c.sense_id)!],
      hasVerification: verification.has(c.sense_id),
      intervals: previewIntervals(c, now),
    })),
  };
}

/** Apply one review. `deliveryId` links the verification answer the learner just gave. */
export async function submitReview(
  db: SupabaseClient,
  userId: string,
  input: {
    clientReviewId: string;
    slug: string;
    rating: UiRating;
    deliveryId?: string;
    durationMs?: number;
  },
) {
  const { data: sense } = await db.from("senses").select("id").eq("slug", input.slug).single();
  if (!sense) return null;
  const { data: cardRow } = await db
    .from("user_cards")
    .select(CARD_COLS)
    .eq("user_id", userId)
    .eq("sense_id", sense.id)
    .maybeSingle();
  if (!cardRow) return null;
  const card = cardRow as DbCard & { sense_id: number };

  let verified: boolean | null = null;
  if (input.deliveryId) {
    const { data: d } = await db
      .from("question_deliveries")
      .select("user_id, correct, answered_at, questions(sense_ids)")
      .eq("id", input.deliveryId)
      .maybeSingle();
    const senseIds = (d?.questions as unknown as { sense_ids: number[] } | null)?.sense_ids ?? [];
    if (d && d.user_id === userId && d.answered_at && senseIds.includes(sense.id))
      verified = !!d.correct;
  }

  const now = new Date();
  const wasDue = new Date(card.due) <= now;
  const { next, grade } = schedule(card, input.rating, now, verified);
  const { error: logErr } = await db.from("review_logs").insert({
    user_id: userId,
    sense_id: sense.id,
    client_review_id: input.clientReviewId,
    rating: grade,
    verified_correct: verified,
    state_before: card.state,
    stability_before: card.stability,
    difficulty_before: card.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    duration_ms: input.durationMs ?? null,
  });
  if (logErr) {
    // Same clientReviewId twice: idempotent replay, nothing changes.
    if (logErr.code === "23505") return { duplicate: true as const, nextDue: card.due, xp: 0 };
    throw logErr;
  }
  await db.from("user_cards").update(next).eq("user_id", userId).eq("sense_id", sense.id);

  let xp = 0;
  let award = null;
  if (verified && wasDue) {
    award = (
      await db.rpc("svc_award_xp", {
        p_user: userId,
        p_amount: 3,
        p_reason: "review",
        p_key: `review:${input.clientReviewId}`,
      })
    ).data;
    xp = 3;
  }
  return { duplicate: false as const, nextDue: next.due, state: next.state, verified, xp, award };
}
