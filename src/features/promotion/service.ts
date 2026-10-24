import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSession } from "@/features/quiz/service";
import { LEVEL_THRESHOLDS } from "@/game/config/progression";

export const BOSS_SIZE = 8;
export const BOSS_PASS = 0.7;
/** Each promotion is a themed boss built from the current rank's colleagues. */
const NEXT_RANK: Record<
  string,
  { to: string; minLevel: number; npcs: string[]; boss: { en: string; vi: string } }
> = {
  intern: {
    to: "junior",
    minLevel: 6,
    npcs: ["linh", "tuan", "sarah", "dave", "emma"],
    boss: { en: "Promotion interview with Robert", vi: "Phỏng vấn thăng chức với Robert" },
  },
  junior: {
    to: "mid",
    minLevel: 13,
    npcs: ["tuan", "sarah", "emma", "raj", "kenji"],
    boss: { en: "Architecture review with Raj", vi: "Buổi review kiến trúc với Raj" },
  },
  mid: {
    to: "senior",
    minLevel: 21,
    npcs: ["mike", "raj", "kenji"],
    boss: { en: "Client demo for Mike", vi: "Demo cho khách hàng Mike" },
  },
  senior: {
    to: "techlead",
    minLevel: 31,
    npcs: ["robert", "mike", "raj", "attendee-a", "attendee-b"],
    boss: { en: "Tech talk on the main stage", vi: "Tech talk trên sân khấu chính" },
  },
};

export class PromotionError extends Error {
  constructor(
    readonly code: "LOCKED" | "NOT_FOUND" | "QUIZ_NOT_FINISHED" | "ALREADY_DONE",
    message: string,
  ) {
    super(message);
  }
}

function shuffle<T>(a: T[]) {
  return [...a].sort(() => Math.random() - 0.5);
}

export async function promotionStatus(db: SupabaseClient, userId: string) {
  const { data: p } = await db.from("profiles").select("rank, level").eq("id", userId).single();
  const step = NEXT_RANK[p?.rank ?? "intern"];
  return {
    rank: p?.rank ?? "intern",
    level: p?.level ?? 1,
    next: step?.to ?? null,
    minLevel: step?.minLevel ?? null,
    boss: step?.boss ?? null,
    eligible: !!step && (p?.level ?? 1) >= step.minLevel,
  };
}

/** Promotion Review: 8 mixed questions from the current rank's NPCs. Retry any time. */
export async function startBoss(db: SupabaseClient, userId: string) {
  const s = await promotionStatus(db, userId);
  if (!s.eligible) throw new PromotionError("LOCKED", `Reach level ${s.minLevel} first`);
  const step = NEXT_RANK[s.rank]!;
  const { data: pool } = await db
    .from("questions")
    .select("id, type")
    .eq("status", "published")
    .in("npc_id", step.npcs)
    .limit(300);
  // A mix of types, not 8 of the same.
  const byType = new Map<string, string[]>();
  for (const q of shuffle(pool ?? []))
    byType.set(q.type as string, [...(byType.get(q.type as string) ?? []), q.id as string]);
  const ids: string[] = [];
  while (ids.length < BOSS_SIZE && [...byType.values()].some((l) => l.length)) {
    for (const list of byType.values())
      if (list.length && ids.length < BOSS_SIZE) ids.push(list.shift()!);
  }
  const session = await createSession(db, userId, { kind: "boss", questionIds: ids });
  return {
    sessionId: session.id,
    total: session.planned_count,
    passAt: Math.ceil(session.planned_count * BOSS_PASS),
  };
}

export async function finishBoss(db: SupabaseClient, userId: string, sessionId: string) {
  const { data: s } = await db
    .from("quiz_sessions")
    .select("user_id, kind, finished_at, correct_count, planned_count")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s || s.user_id !== userId || s.kind !== "boss")
    throw new PromotionError("NOT_FOUND", "Session not found");
  if (!s.finished_at) throw new PromotionError("QUIZ_NOT_FINISHED", "Finish all questions first");
  const passed = s.correct_count / s.planned_count >= BOSS_PASS;
  const status = await promotionStatus(db, userId);
  if (!passed)
    return { passed, correct: s.correct_count, total: s.planned_count, rank: status.rank };
  const perfect = s.correct_count === s.planned_count;
  await db.rpc("svc_award_xp", {
    p_user: userId,
    p_amount: perfect ? 200 : 150,
    p_reason: "boss_pass",
    p_key: `boss:${sessionId}`,
    p_ref_type: "quiz_session",
    p_ref_id: sessionId,
    p_coins: 50,
  });
  const { data: rank } = status.next
    ? await db.rpc("svc_promote", { p_user: userId, p_to: status.next })
    : { data: status.rank };
  return {
    passed,
    perfect,
    correct: s.correct_count,
    total: s.planned_count,
    rank: rank as string,
  };
}

// ----- placement test (once, at onboarding) -----
export async function startPlacement(db: SupabaseClient, userId: string) {
  const { data: p } = await db
    .from("profiles")
    .select("placement_level, xp_total")
    .eq("id", userId)
    .single();
  if (p?.placement_level) throw new PromotionError("ALREADY_DONE", "Placement already done");
  const pick = async (cefr: string) => {
    const { data } = await db
      .from("questions")
      .select("id")
      .eq("status", "published")
      .eq("cefr", cefr)
      .in("type", ["mcq_meaning", "fill_blank", "error_correction", "reply_choice"])
      .limit(100);
    return shuffle((data ?? []).map((d) => d.id as string)).slice(0, 4);
  };
  const ids = [...(await pick("A2")), ...(await pick("B1")), ...(await pick("B2"))];
  const session = await createSession(db, userId, { kind: "placement", questionIds: ids });
  return { sessionId: session.id, total: session.planned_count };
}

/** Score by level band: B1 3/4 → Junior (L6); B1 and B2 3/4 → Mid (L13). */
export function placementLevel(correctByCefr: Record<string, number>) {
  const b1 = correctByCefr.B1 ?? 0;
  const b2 = correctByCefr.B2 ?? 0;
  if (b1 >= 3 && b2 >= 3) return { cefr: "B2" as const, startLevel: 13, ranks: ["junior", "mid"] };
  if (b1 >= 3) return { cefr: "B1" as const, startLevel: 6, ranks: ["junior"] };
  return { cefr: "A2" as const, startLevel: 1, ranks: [] as string[] };
}

export async function finishPlacement(db: SupabaseClient, userId: string, sessionId: string) {
  const { data: s } = await db
    .from("quiz_sessions")
    .select("user_id, kind, finished_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s || s.user_id !== userId || s.kind !== "placement")
    throw new PromotionError("NOT_FOUND", "Session not found");
  if (!s.finished_at) throw new PromotionError("QUIZ_NOT_FINISHED", "Finish all questions first");
  const { data: answers } = await db
    .from("question_deliveries")
    .select("correct, questions(cefr)")
    .eq("session_id", sessionId);
  const correct: Record<string, number> = {};
  for (const a of answers ?? []) {
    const cefr = (a.questions as unknown as { cefr: string }).cefr;
    if (a.correct) correct[cefr] = (correct[cefr] ?? 0) + 1;
  }
  const result = placementLevel(correct);
  const { data: p } = await db
    .from("profiles")
    .select("xp_total, placement_level")
    .eq("id", userId)
    .single();
  if (p?.placement_level) throw new PromotionError("ALREADY_DONE", "Placement already done");
  await db
    .from("profiles")
    .update({
      placement_level: result.cefr,
      target_level: result.cefr === "B2" ? "B2" : result.cefr,
    })
    .eq("id", userId);
  const target = LEVEL_THRESHOLDS[result.startLevel - 1]!;
  const gap = target - (p?.xp_total ?? 0);
  // One ledger event is capped at 5000 XP, so a Mid placement (5100) goes in two chunks.
  for (let left = gap, i = 0; left > 0; left -= 5000, i++) {
    await db.rpc("svc_award_xp", {
      p_user: userId,
      p_amount: Math.min(left, 5000),
      p_reason: "admin_adjust",
      p_key: `placement:${i}`,
      p_ref_type: "placement",
      p_ref_id: sessionId,
    });
  }
  for (const r of result.ranks) await db.rpc("svc_promote", { p_user: userId, p_to: r });
  return { ...result, correct };
}
