import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClientPrompt, type ClientPrompt } from "./deliver";
import { grade, revealAnswer } from "./grade";
import type { QuizResponse, StoredAnswer, StoredPrompt } from "./types";

const DELIVERY_TTL_MS = 10 * 60_000;
const MAX_OPEN_DELIVERIES = 3;

export class QuizError extends Error {
  constructor(
    readonly code:
      "NOT_FOUND" | "ALREADY_ANSWERED" | "DELIVERY_EXPIRED" | "TOO_MANY_OPEN" | "EMPTY",
    message: string,
  ) {
    super(message);
  }
}

export type SessionKind = "npc" | "daily" | "practice" | "review_verify" | "placement" | "boss";

/** Create a quiz session over explicit question ids (dialogue quiz nodes, bosses) or picked ones. */
export async function createSession(
  db: SupabaseClient,
  userId: string,
  opts: { kind: SessionKind; npcId?: string; questionIds: string[] },
) {
  if (!opts.questionIds.length) throw new QuizError("EMPTY", "No questions available");
  const { data, error } = await db
    .from("quiz_sessions")
    .insert({
      user_id: userId,
      kind: opts.kind,
      npc_id: opts.npcId ?? null,
      question_ids: opts.questionIds,
      planned_count: opts.questionIds.length,
    })
    .select("id, planned_count")
    .single();
  if (error) throw error;
  return data as { id: string; planned_count: number };
}

export async function questionIdsBySlug(db: SupabaseClient, slugs: string[]) {
  const { data, error } = await db
    .from("questions")
    .select("id, slug")
    .in("slug", slugs)
    .eq("status", "published");
  if (error) throw error;
  const bySlug = new Map((data ?? []).map((q) => [q.slug as string, q.id as string]));
  return slugs.map((s) => bySlug.get(s)).filter((id): id is string => !!id);
}

/** Pick `size` published questions for practice, preferring ones not answered correctly lately. */
export async function pickPracticeQuestions(
  db: SupabaseClient,
  userId: string,
  npcId: string | undefined,
  size: number,
) {
  let q = db.from("questions").select("id").eq("status", "published").limit(200);
  if (npcId) q = q.eq("npc_id", npcId);
  const { data: pool, error } = await q;
  if (error) throw error;
  const { data: recent } = await db
    .from("user_answers")
    .select("question_id")
    .eq("user_id", userId)
    .eq("is_correct", true)
    .gt("created_at", new Date(Date.now() - 14 * 86_400_000).toISOString());
  const seen = new Set((recent ?? []).map((r) => r.question_id as string));
  const ids = (pool ?? []).map((p) => p.id as string);
  const shuffled = ids.sort(() => Math.random() - 0.5);
  return [
    ...shuffled.filter((id) => !seen.has(id)),
    ...shuffled.filter((id) => seen.has(id)),
  ].slice(0, size);
}

export interface DeliveryView {
  deliveryId: string;
  index: number;
  total: number;
  type: StoredPrompt["type"];
  prompt: ClientPrompt;
  hasHint: boolean;
  expiresAt: string;
}

/** Next question of a session. Re-requesting returns the same pending delivery (no reshuffle). */
export async function nextDelivery(
  db: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<DeliveryView | { done: true; answered: number; correct: number; total: number }> {
  const { data: session, error } = await db
    .from("quiz_sessions")
    .select("id, question_ids, planned_count, answered_count, correct_count, finished_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!session) throw new QuizError("NOT_FOUND", "Session not found");
  if (session.finished_at) {
    return {
      done: true,
      answered: session.answered_count,
      correct: session.correct_count,
      total: session.planned_count,
    };
  }

  const { data: pending } = await db
    .from("question_deliveries")
    .select("id, question_id, client_prompt, expires_at, question_versions(hint_vi, prompt)")
    .eq("session_id", sessionId)
    .is("answered_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("served_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pending) {
    const v = pending.question_versions as unknown as {
      hint_vi: string | null;
      prompt: StoredPrompt;
    };
    return {
      deliveryId: pending.id,
      index: session.answered_count + 1,
      total: session.planned_count,
      type: v.prompt.type,
      prompt: pending.client_prompt as ClientPrompt,
      hasHint: !!v.hint_vi,
      expiresAt: pending.expires_at,
    };
  }

  const { count } = await db
    .from("question_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("answered_at", null)
    .gt("expires_at", new Date().toISOString());
  if ((count ?? 0) >= MAX_OPEN_DELIVERIES)
    throw new QuizError("TOO_MANY_OPEN", "Finish your open questions first");

  // Questions already delivered (answered or expired) in this session are skipped.
  const { data: delivered } = await db
    .from("question_deliveries")
    .select("question_id, answered_at")
    .eq("session_id", sessionId);
  const answered = new Set(
    (delivered ?? []).filter((d) => d.answered_at).map((d) => d.question_id as string),
  );
  const questionId = (session.question_ids as string[]).find((id) => !answered.has(id));
  if (!questionId) throw new QuizError("NOT_FOUND", "Nothing left in this session");

  const { data: q, error: qErr } = await db
    .from("questions")
    .select(
      "id, current_version_id, question_versions!questions_current_version_fk(id, prompt, hint_vi)",
    )
    .eq("id", questionId)
    .single();
  if (qErr) throw qErr;
  const version = q.question_versions as unknown as {
    id: string;
    prompt: StoredPrompt;
    hint_vi: string | null;
  };
  const { client, optionMap } = buildClientPrompt(version.prompt);
  const expiresAt = new Date(Date.now() + DELIVERY_TTL_MS).toISOString();
  const { data: d, error: dErr } = await db
    .from("question_deliveries")
    .insert({
      user_id: userId,
      session_id: sessionId,
      question_id: q.id,
      question_version_id: version.id,
      option_map: optionMap,
      client_prompt: client,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (dErr) throw dErr;
  return {
    deliveryId: d.id,
    index: session.answered_count + 1,
    total: session.planned_count,
    type: version.prompt.type,
    prompt: client,
    hasHint: !!version.hint_vi,
    expiresAt,
  };
}

async function loadDelivery(db: SupabaseClient, userId: string, deliveryId: string) {
  const { data, error } = await db
    .from("question_deliveries")
    .select(
      "id, user_id, option_map, answered_at, attempts, question_versions(prompt, answer, hint_vi, explanation_vi, explanation_en)",
    )
    .eq("id", deliveryId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== userId) throw new QuizError("NOT_FOUND", "Question not found");
  return data as unknown as {
    id: string;
    option_map: Record<string, string>;
    answered_at: string | null;
    attempts: number;
    question_versions: {
      prompt: StoredPrompt;
      answer: StoredAnswer;
      hint_vi: string | null;
      explanation_vi: string | null;
      explanation_en: string | null;
    };
  };
}

export async function submitAnswer(
  db: SupabaseClient,
  userId: string,
  deliveryId: string,
  response: QuizResponse,
) {
  const d = await loadDelivery(db, userId, deliveryId);
  if (d.answered_at) throw new QuizError("ALREADY_ANSWERED", "Already answered");
  const v = d.question_versions;
  const correct = grade(v.prompt, v.answer, response, d.option_map);

  const { data, error } = await db.rpc("svc_record_attempt", {
    p_delivery: deliveryId,
    p_user: userId,
    p_response: response,
    p_is_correct: correct,
  });
  if (error) {
    if (error.hint === "ALREADY_ANSWERED")
      throw new QuizError("ALREADY_ANSWERED", "Already answered");
    if (error.hint === "DELIVERY_EXPIRED")
      throw new QuizError("DELIVERY_EXPIRED", "This question expired");
    throw error;
  }
  const r = data as {
    final: boolean;
    attempt: number;
    correct: boolean;
    xp: number;
    award: {
      xp_total: number;
      level: number;
      leveled_up: boolean;
      coins: number;
      streak: number;
    } | null;
    session: { answered: number; correct: number; total: number; done: boolean } | null;
  };

  if (!r.final) {
    // First miss: a hint, never the answer.
    return {
      final: false as const,
      correct: false,
      attempt: r.attempt,
      hint: v.hint_vi ?? "Thử đọc lại câu một lần nữa nhé.",
    };
  }
  return {
    final: true as const,
    correct: r.correct,
    attempt: r.attempt,
    xp: r.xp,
    answer: revealAnswer(v.answer, d.option_map),
    explanation: { vi: v.explanation_vi, en: v.explanation_en },
    totals: r.award
      ? {
          xpTotal: r.award.xp_total,
          level: r.award.level,
          leveledUp: r.award.leveled_up,
          coins: r.award.coins,
          streak: r.award.streak,
        }
      : null,
    session: r.session,
  };
}

export async function useHint(db: SupabaseClient, userId: string, deliveryId: string) {
  const d = await loadDelivery(db, userId, deliveryId);
  if (d.answered_at) throw new QuizError("ALREADY_ANSWERED", "Already answered");
  await db.from("question_deliveries").update({ hint_used: true }).eq("id", deliveryId);
  return { hint: d.question_versions.hint_vi ?? "Không có gợi ý cho câu này." };
}
