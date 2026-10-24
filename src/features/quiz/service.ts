import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClientPrompt, type ClientPrompt } from "./deliver";
import { grade, revealAnswer, timeLimitSec } from "./grade";
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

/** Lesson tests, level test-outs and the quick check behind a verified SRS review. */
export type SessionKind = "lesson" | "test_out" | "review_verify";

/** Network slack before a late answer counts as a timeout. */
const TIME_GRACE_MS = 3000;

/** Create a quiz session over explicit question ids. */
export async function createSession(
  db: SupabaseClient,
  userId: string,
  opts: {
    kind: SessionKind;
    ref?: string;
    questionIds: string[];
    /** Exam mode (study tracks): one answer per question, each against the clock. */
    strict?: boolean;
  },
) {
  if (!opts.questionIds.length) throw new QuizError("EMPTY", "No questions available");
  const { data, error } = await db
    .from("quiz_sessions")
    .insert({
      user_id: userId,
      kind: opts.kind,
      ref: opts.ref ?? null,
      question_ids: opts.questionIds,
      planned_count: opts.questionIds.length,
      max_attempts: opts.strict ? 1 : 2,
      time_limited: !!opts.strict,
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

export interface DeliveryView {
  deliveryId: string;
  index: number;
  total: number;
  type: StoredPrompt["type"];
  prompt: ClientPrompt;
  hasHint: boolean;
  expiresAt: string;
  /** Timed sessions: when this question times out. */
  deadline: string | null;
  timeLimitSec: number | null;
}

/** Next question of a session. Re-requesting returns the same pending delivery (no reshuffle). */
export async function nextDelivery(
  db: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<DeliveryView | { done: true; answered: number; correct: number; total: number }> {
  const { data: session, error } = await db
    .from("quiz_sessions")
    .select(
      "id, question_ids, planned_count, answered_count, correct_count, finished_at, time_limited",
    )
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
    .select(
      "id, question_id, client_prompt, expires_at, served_at, question_versions(hint_vi, prompt)",
    )
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
      ...timing(session.time_limited, v.prompt, pending.served_at),
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
  const { client, optionMap } = buildClientPrompt(
    version.prompt,
    undefined,
    undefined,
    session.time_limited,
  );
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
    .select("id, served_at")
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
    ...timing(session.time_limited, version.prompt, d.served_at),
  };
}

function timing(timed: boolean, prompt: StoredPrompt, servedAt: string) {
  if (!timed) return { deadline: null, timeLimitSec: null };
  const sec = timeLimitSec(prompt);
  return { deadline: new Date(Date.parse(servedAt) + sec * 1000).toISOString(), timeLimitSec: sec };
}

async function loadDelivery(db: SupabaseClient, userId: string, deliveryId: string) {
  const { data, error } = await db
    .from("question_deliveries")
    .select(
      "id, user_id, option_map, answered_at, attempts, served_at, quiz_sessions(max_attempts, time_limited), question_versions(prompt, answer, hint_vi, explanation_vi, explanation_en)",
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
    served_at: string;
    quiz_sessions: { max_attempts: number; time_limited: boolean } | null;
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
  const s = d.quiz_sessions;
  // A timed question answered after its deadline counts as wrong, whatever was sent.
  const late =
    !!s?.time_limited &&
    Date.now() > Date.parse(d.served_at) + timeLimitSec(v.prompt) * 1000 + TIME_GRACE_MS;
  const correct = !late && grade(v.prompt, v.answer, response, d.option_map);

  const { data, error } = await db.rpc("svc_record_attempt", {
    p_delivery: deliveryId,
    p_user: userId,
    p_response: response,
    p_is_correct: correct,
    p_max_attempts: s?.max_attempts ?? 2,
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
      streak: number;
      day_xp: number;
      daily_goal: number;
      goal_met_now: boolean;
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
          streak: r.award.streak,
          todayXp: r.award.day_xp,
          dailyGoal: r.award.daily_goal,
          goalMetNow: r.award.goal_met_now,
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
