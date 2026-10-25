import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSession } from "@/features/quiz/service";
import { LearnError } from "./service";

const PRACTICE_SIZE = 16;

/**
 * Untimed practice over a lesson the learner has already passed. The session's kind is
 * `lesson_practice`, which `private.complete_lesson` never grades: no stars, XP or lesson progress.
 */
export async function startPractice(db: SupabaseClient, userId: string, lessonId: number) {
  const { data: p, error: pErr } = await db
    .from("user_lesson_progress")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!p?.completed_at)
    throw new LearnError("LOCKED", "Hoàn thành bài kiểm tra trước khi luyện tập");

  const { data: qs, error } = await db
    .from("lesson_questions")
    .select("question_id, questions!inner(status)")
    .eq("lesson_id", lessonId)
    .eq("questions.status", "published");
  if (error) throw error;
  const ids = (qs ?? []).map((q) => q.question_id as string);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  if (!ids.length) throw new LearnError("EMPTY", "This lesson has no questions yet");
  const session = await createSession(db, userId, {
    kind: "lesson_practice",
    ref: `practice:${lessonId}`,
    questionIds: ids.slice(0, PRACTICE_SIZE),
    strict: false,
    maxAttempts: 1,
  });
  return { sessionId: session.id };
}
