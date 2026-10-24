import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { glossary } from "@/features/dialogue/service";
import { localDate } from "@/lib/time";
import { newWordCount, selectWords, type Candidate } from "./selectWords";

const LEVEL_OF_CEFR: Record<string, string> = { A1: "A2", A2: "A2", B1: "B1", B2: "B2", C1: "B2" };

/** Today's 5 words for a learner, materialised on first request so the set never changes mid-day. */
export async function getDaily(db: SupabaseClient, userId: string) {
  const { data: p } = await db
    .from("profiles")
    .select("timezone, target_level, placement_level")
    .eq("id", userId)
    .single();
  const day = localDate(new Date(), p?.timezone ?? "Asia/Ho_Chi_Minh");
  let { data: rows } = await db
    .from("user_daily_words")
    .select("slot, sense_id, learned_at")
    .eq("user_id", userId)
    .eq("day", day)
    .order("slot");

  if (!rows?.length) {
    const [
      { data: cards },
      { data: skips },
      { count: due },
      { data: senses },
      { data: withQuestions },
    ] = await Promise.all([
      db.from("user_cards").select("sense_id").eq("user_id", userId),
      db
        .from("user_word_skips")
        .select("sense_id")
        .eq("user_id", userId)
        .gt("skipped_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
      db
        .from("user_cards")
        .select("sense_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .lte("due", new Date().toISOString()),
      db
        .from("senses")
        .select("id, topic, lexemes(cefr, is_it_term, ngsl_rank, display)")
        .eq("review_status", "published")
        .limit(3000),
      db.from("questions").select("sense_ids").eq("status", "published"),
    ]);
    const known = new Set([...(cards ?? []), ...(skips ?? [])].map((c) => c.sense_id as number));
    const questionCount = new Map<number, number>();
    for (const q of withQuestions ?? [])
      for (const s of q.sense_ids as number[])
        questionCount.set(s, (questionCount.get(s) ?? 0) + 1);
    const lemmas = new Map<number, string>();
    const candidates: Candidate[] = (senses ?? [])
      .filter((s) => !known.has(s.id) && (questionCount.get(s.id) ?? 0) >= 2)
      .map((s) => {
        const lex = s.lexemes as unknown as {
          cefr: string | null;
          is_it_term: boolean;
          ngsl_rank: number | null;
          display: string;
        };
        lemmas.set(s.id, lex.display.toLowerCase());
        return {
          senseId: s.id,
          topic: s.topic ?? "general",
          cefr: lex.cefr ?? "B1",
          isIt: lex.is_it_term,
          rank: lex.ngsl_rank,
        };
      });
    const level = LEVEL_OF_CEFR[p?.placement_level ?? p?.target_level ?? "A2"] ?? "A2";
    const picked = selectWords({
      candidates,
      userLevel: level,
      seed: `${userId}:${day}`,
      count: newWordCount(due ?? 0),
      lemmas,
    });
    if (picked.length) {
      await db.from("user_daily_words").upsert(
        picked.map((sense_id, i) => ({ user_id: userId, day, slot: i + 1, sense_id })),
        { onConflict: "user_id,day,slot", ignoreDuplicates: true },
      );
    }
    rows =
      (
        await db
          .from("user_daily_words")
          .select("slot, sense_id, learned_at")
          .eq("user_id", userId)
          .eq("day", day)
          .order("slot")
      ).data ?? [];
  }

  const { data: slugs } = await db
    .from("senses")
    .select("id, slug")
    .in(
      "id",
      rows.map((r) => r.sense_id),
    );
  const slugOf = new Map((slugs ?? []).map((s) => [s.id as number, s.slug as string]));
  const gloss = await glossary(db, [...slugOf.values()]);
  return {
    day,
    words: rows
      .map((r) => ({ slot: r.slot, learned: !!r.learned_at, ...gloss[slugOf.get(r.sense_id)!]! }))
      .filter((w) => w.slug),
  };
}

/** Learn (or "I know this") one of today's words: adds an SRS card and pays XP once. */
export async function learnDaily(db: SupabaseClient, userId: string, slug: string, known: boolean) {
  const { data: p } = await db.from("profiles").select("timezone").eq("id", userId).single();
  const day = localDate(new Date(), p?.timezone ?? "Asia/Ho_Chi_Minh");
  const { data: sense } = await db.from("senses").select("id").eq("slug", slug).single();
  if (!sense) return null;
  const { data: row } = await db
    .from("user_daily_words")
    .select("learned_at")
    .eq("user_id", userId)
    .eq("day", day)
    .eq("sense_id", sense.id)
    .maybeSingle();
  if (!row) return null; // not one of today's words
  if (!row.learned_at) {
    await db
      .from("user_daily_words")
      .update({ learned_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("day", day)
      .eq("sense_id", sense.id);
  }
  await db.rpc("svc_add_card", { p_user: userId, p_sense: sense.id, p_via: "daily" });
  if (known) {
    // Start already-known words in review with a week's interval instead of learning steps.
    await db
      .from("user_cards")
      .update({
        state: "review",
        stability: 7,
        difficulty: 4,
        scheduled_days: 7,
        due: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        reps: 1,
      })
      .eq("user_id", userId)
      .eq("sense_id", sense.id)
      .eq("reps", 0);
  }
  const award = (
    await db.rpc("svc_award_xp", {
      p_user: userId,
      p_amount: 5,
      p_reason: "daily_learn",
      p_key: `daily:${day}:${sense.id}`,
    })
  ).data as {
    duplicate: boolean;
    xp_total: number;
    level: number;
    leveled_up?: boolean;
    coins?: number;
    streak: number;
  };
  const { count } = await db
    .from("user_daily_words")
    .select("slot", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("day", day)
    .is("learned_at", null);
  let bonus = null;
  if ((count ?? 0) === 0) {
    bonus = (
      await db.rpc("svc_award_xp", {
        p_user: userId,
        p_amount: 25,
        p_reason: "daily_complete",
        p_key: `daily_complete:${day}`,
        p_coins: 5,
      })
    ).data;
  }
  return { award, bonus, remaining: count ?? 0, firstTime: !row.learned_at };
}
