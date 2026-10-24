import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const OWN_TABLES = [
  "profiles",
  "xp_events",
  "daily_activity",
  "user_cards",
  "review_logs",
  "user_answers",
  "lesson_runs",
  "quiz_sessions",
  "user_lesson_progress",
  "user_unit_progress",
  "question_reports",
] as const;

/** Everything we store about a learner (data-subject access request, PDPD). */
export async function exportAccount(db: SupabaseClient, userId: string) {
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), userId };
  for (const t of OWN_TABLES) {
    const col = t === "profiles" ? "id" : "user_id";
    const { data, error } = await db.from(t).select("*").eq(col, userId).limit(10000);
    out[t] = error ? { error: error.message } : data;
  }
  return out;
}

/** Hard delete: removing the auth user cascades to every learner-owned row. */
export async function deleteAccount(db: SupabaseClient, userId: string) {
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw error;
}

/** Move a guest's progress into the signed-in account; proves ownership with the guest's access token. */
export async function mergeGuest(db: SupabaseClient, userId: string, guestAccessToken: string) {
  const { data, error } = await db.auth.getUser(guestAccessToken);
  if (error || !data.user?.is_anonymous)
    return { merged: false as const, reason: "not a guest session" };
  if (data.user.id === userId) return { merged: false as const, reason: "same account" };
  const { data: result, error: e2 } = await db.rpc("svc_merge_guest", {
    p_from: data.user.id,
    p_to: userId,
  });
  if (e2) throw e2;
  return { merged: true as const, ...(result as { xp: number; cards: number }) };
}
