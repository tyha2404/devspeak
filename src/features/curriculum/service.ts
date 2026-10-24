import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { glossary, startDialogueRun } from "@/features/dialogue/service";
import { gradeWriting } from "@/features/dialogue/grading";
import { createSession } from "@/features/quiz/service";
import type {
  ExamResult,
  ExamStart,
  Home,
  LessonContent,
  LessonResult,
  LessonStart,
  LessonView,
  MistakeItem,
  NextUp,
  TaskResult,
} from "@/lib/contracts/learn";
import { localDate } from "@/lib/time";
import {
  buildPath,
  findLesson,
  findUnit,
  placementUnit,
  type LearnerProgress,
  type LessonRow,
  type PathStage,
  type StageRow,
  type UnitRow,
} from "./path";

export class LearnError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "LOCKED"
      | "ALREADY_DONE"
      | "QUIZ_NOT_FINISHED"
      | "DIALOGUE_NOT_FINISHED"
      | "TASK_NOT_GRADED"
      | "EMPTY",
    message: string,
  ) {
    super(message);
  }
}

const TEST_OUT_SIZE = 8;
/** An unfinished run younger than this is resumed instead of starting a new one. */
const RESUME_MS = 2 * 3600_000;

const shuffle = <T>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

// ----- path -----

export async function loadPath(db: SupabaseClient, userId: string) {
  const [stages, units, lessons, lp, up, certs] = await Promise.all([
    db
      .from("stages")
      .select(
        "id, slug, sort, cefr, title_en, title_vi, tagline_vi, checkpoint_size, checkpoint_pass_pct",
      ),
    db
      .from("units")
      .select(
        "id, stage_id, slug, sort, code, kind, cefr, character, title_en, title_vi, summary_vi, can_do, status",
      ),
    db.from("lessons").select("id, unit_id, slug, sort, kind, title_en, title_vi, est_minutes, xp"),
    db.from("user_lesson_progress").select("lesson_id, stars, completed_at").eq("user_id", userId),
    db.from("user_unit_progress").select("unit_id, via").eq("user_id", userId),
    db.from("certificates").select("id, stage_id, score_pct").eq("user_id", userId),
  ]);
  for (const r of [stages, units, lessons, lp, up, certs]) if (r.error) throw r.error;
  const progress: LearnerProgress = {
    lessons: new Map(
      (lp.data ?? []).map((p) => [p.lesson_id, { stars: p.stars, completed: !!p.completed_at }]),
    ),
    units: new Map((up.data ?? []).map((u) => [u.unit_id, u.via])),
    certificates: new Map(
      (certs.data ?? []).map((c) => [c.stage_id, { id: c.id, score: c.score_pct }]),
    ),
  };
  return buildPath(
    stages.data as StageRow[],
    units.data as UnitRow[],
    lessons.data as LessonRow[],
    progress,
  );
}

function describeNext(
  stages: PathStage[],
  next: ReturnType<typeof buildPath>["next"],
): NextUp | null {
  if (!next) return null;
  const stage = stages.find((s) => s.id === next.stageId)!;
  const unit = next.unitId ? stage.units.find((u) => u.id === next.unitId)! : null;
  const lessonIdx =
    unit && next.lessonId ? unit.lessons.findIndex((l) => l.id === next.lessonId) : -1;
  const lesson = unit && lessonIdx >= 0 ? unit.lessons[lessonIdx]! : null;
  return {
    type: next.type,
    stage: { id: stage.id, title: stage.title, cefr: stage.cefr },
    unit: unit
      ? { id: unit.id, code: unit.code, title: unit.title, character: unit.character }
      : null,
    lesson: lesson
      ? { id: lesson.id, title: lesson.title, kind: lesson.kind, minutes: lesson.minutes }
      : null,
    index: lesson ? lessonIdx + 1 : null,
    total: unit ? unit.lessons.length : null,
  };
}

export async function home(db: SupabaseClient, userId: string, isGuest: boolean): Promise<Home> {
  const { data: p, error } = await db
    .from("profiles")
    .select(
      "display_name, xp_total, streak_current, streak_last_date, streak_freezes, daily_goal_xp, timezone, onboarded_at, placement_level",
    )
    .eq("id", userId)
    .single();
  if (error) throw error;
  const today = localDate(new Date(), p.timezone);
  const [path, { data: day }, { count: due }] = await Promise.all([
    loadPath(db, userId),
    db
      .from("daily_activity")
      .select("xp")
      .eq("user_id", userId)
      .eq("local_date", today)
      .maybeSingle(),
    db
      .from("user_cards")
      .select("sense_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("due", new Date().toISOString()),
  ]);
  // A streak only survives if yesterday (or today) counted; show 0 once it has lapsed.
  const yesterday = localDate(new Date(Date.now() - 86_400_000), p.timezone);
  const twoDaysAgo = localDate(new Date(Date.now() - 2 * 86_400_000), p.timezone);
  const last = p.streak_last_date as string | null;
  const alive =
    last === today || last === yesterday || (last === twoDaysAgo && p.streak_freezes > 0);
  const units = path.stages.flatMap((s) => s.units).filter((u) => u.state !== "coming_soon");
  return {
    me: {
      displayName: p.display_name,
      isGuest,
      xpTotal: p.xp_total,
      streak: alive ? p.streak_current : 0,
      streakFreezes: p.streak_freezes,
      dailyGoal: p.daily_goal_xp,
      todayXp: day?.xp ?? 0,
      onboarded: !!p.onboarded_at,
      placementDone: !!p.placement_level,
    },
    next: describeNext(path.stages, path.next),
    srsDue: due ?? 0,
    overall: { done: units.filter((u) => u.state === "completed").length, total: units.length },
  };
}

export async function nextUp(db: SupabaseClient, userId: string) {
  const path = await loadPath(db, userId);
  return describeNext(path.stages, path.next);
}

// ----- lessons -----

async function openLesson(db: SupabaseClient, userId: string, lessonId: number) {
  const path = await loadPath(db, userId);
  const found = findLesson(path.stages, lessonId);
  if (!found) throw new LearnError("NOT_FOUND", "Lesson not found");
  if (found.lesson.state === "locked")
    throw new LearnError("LOCKED", "Finish the previous lesson first");
  return found;
}

export async function lessonView(
  db: SupabaseClient,
  userId: string,
  lessonId: number,
): Promise<LessonView> {
  const { stage, unit, lesson } = await openLesson(db, userId, lessonId);
  const { data: row, error } = await db
    .from("lessons")
    .select("kind, body, question_count")
    .eq("id", lessonId)
    .single();
  if (error) throw error;
  const body = row.body as Record<string, unknown>;
  let content: LessonContent;
  switch (row.kind as LessonContent["kind"]) {
    case "vocab": {
      const slugs = body.senses as string[];
      const g = await glossary(db, slugs);
      content = { kind: "vocab", words: slugs.map((s) => g[s]).filter((w) => !!w) };
      break;
    }
    case "focus":
      content = {
        kind: "focus",
        markdown: body.markdown as string,
        examples: (body.examples as { en: string; vi?: string }[]) ?? [],
      };
      break;
    case "reading":
      content = { kind: "reading", passage: body.passage as never };
      break;
    case "mistakes": {
      const slugs = body.mistakes as string[];
      const { data: rows } = await db
        .from("mistakes")
        .select("slug, kind, wrong, right, say, explanation_vi")
        .in("slug", slugs);
      const bySlug = new Map((rows ?? []).map((m) => [m.slug, m]));
      content = {
        kind: "mistakes",
        items: slugs
          .map((s) => bySlug.get(s))
          .filter((m) => !!m)
          .map((m): MistakeItem => ({
            slug: m.slug,
            kind: m.kind,
            wrong: m.wrong,
            right: m.right,
            say: m.say,
            explanation: m.explanation_vi,
          })),
      };
      break;
    }
    case "task":
      content = {
        kind: "task",
        mode: body.mode as "write" | "speak",
        context: (body.context as { speaker: string; text: string }[]) ?? [],
        prompt: body.prompt as { en: string; vi: string },
      };
      break;
    default:
      content = { kind: row.kind } as LessonContent;
  }
  return {
    id: lesson.id,
    slug: lesson.slug,
    kind: content.kind,
    title: lesson.title,
    minutes: lesson.minutes,
    xp: lesson.xp,
    questionCount: row.question_count,
    stars: lesson.stars,
    completed: lesson.state === "completed",
    unit: { id: unit.id, code: unit.code, title: unit.title, character: unit.character },
    stage: { id: stage.id, title: stage.title },
    index: unit.lessons.findIndex((l) => l.id === lesson.id) + 1,
    total: unit.lessons.length,
    content,
  };
}

/** Start (or resume) a lesson: quiz session over its questions, dialogue run, vocabulary cards. */
export async function startLesson(
  db: SupabaseClient,
  userId: string,
  lessonId: number,
): Promise<LessonStart> {
  await openLesson(db, userId, lessonId);
  const { data: l, error } = await db
    .from("lessons")
    .select("id, kind, body, question_count, dialogue_id")
    .eq("id", lessonId)
    .single();
  if (error) throw error;

  const { data: open } = await db
    .from("lesson_runs")
    .select("id, quiz_session_id, dialogue_run_id, started_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .is("finished_at", null)
    .gt("started_at", new Date(Date.now() - RESUME_MS).toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) {
    return {
      runId: open.id,
      sessionId: open.quiz_session_id,
      dialogue: open.dialogue_run_id
        ? await startDialogueRun(db, userId, l.dialogue_id!, open.dialogue_run_id)
        : null,
    };
  }

  let sessionId: string | null = null;
  if (l.question_count > 0) {
    const { data: qs, error: qErr } = await db
      .from("lesson_questions")
      .select("question_id, sort, questions!inner(status)")
      .eq("lesson_id", lessonId)
      .eq("questions.status", "published")
      .order("sort");
    if (qErr) throw qErr;
    const ids = (qs ?? []).map((q) => q.question_id as string);
    const picked = ids.length > l.question_count ? shuffle(ids).slice(0, l.question_count) : ids;
    if (!picked.length) throw new LearnError("EMPTY", "This lesson has no questions yet");
    const s = await createSession(db, userId, {
      kind: "lesson",
      ref: `lesson:${lessonId}`,
      questionIds: picked,
    });
    sessionId = s.id;
  }

  let dialogue: LessonStart["dialogue"] = null;
  if (l.kind === "dialogue" && l.dialogue_id)
    dialogue = await startDialogueRun(db, userId, l.dialogue_id);

  if (l.kind === "vocab") {
    const slugs = (l.body as { senses: string[] }).senses;
    const { data: senses } = await db.from("senses").select("id").in("slug", slugs);
    for (const s of senses ?? [])
      await db.rpc("svc_add_card", { p_user: userId, p_sense: s.id, p_via: "lesson" });
  }

  const { data: run, error: runErr } = await db
    .from("lesson_runs")
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      quiz_session_id: sessionId,
      dialogue_run_id: dialogue?.runId ?? null,
    })
    .select("id")
    .single();
  if (runErr) throw runErr;
  return { runId: run.id, sessionId, dialogue };
}

async function loadRun(db: SupabaseClient, userId: string, runId: string) {
  const { data: run } = await db
    .from("lesson_runs")
    .select("id, user_id, lesson_id, finished_at, task_score")
    .eq("id", runId)
    .maybeSingle();
  if (!run || run.user_id !== userId) throw new LearnError("NOT_FOUND", "Lesson run not found");
  if (run.finished_at) throw new LearnError("ALREADY_DONE", "This lesson run is finished");
  return run;
}

/** Grade a task answer (Claude, or the keyword heuristic as fallback). Keeps the best score. */
export async function gradeTask(
  db: SupabaseClient,
  userId: string,
  runId: string,
  text: string,
): Promise<TaskResult> {
  const run = await loadRun(db, userId, runId);
  const { data: l } = await db
    .from("lessons")
    .select("kind, body, private")
    .eq("id", run.lesson_id)
    .single();
  if (l?.kind !== "task") throw new LearnError("NOT_FOUND", "Not a task lesson");
  const body = l.body as { prompt: { en: string }; context: { speaker: string; text: string }[] };
  const priv = l.private as { keywords: string[]; model_answer: string };
  const g = await gradeWriting(db, userId, body.prompt.en, body.context, priv.keywords, text);
  const score = Math.max(g.score, run.task_score ?? 0);
  await db
    .from("lesson_runs")
    .update({ task_score: score, task_feedback: { ...g, text: text.slice(0, 1000) } })
    .eq("id", run.id);
  return {
    score: g.score,
    toneOk: g.tone_ok,
    feedback: g.feedback_vi,
    fixes: g.grammar_fixes,
    better: g.better_version,
    modelAnswer: priv.model_answer,
  };
}

export async function completeLesson(
  db: SupabaseClient,
  userId: string,
  runId: string,
): Promise<LessonResult> {
  const { data, error } = await db.rpc("svc_complete_lesson", { p_user: userId, p_run: runId });
  if (error) {
    if (error.code === "P0002") throw new LearnError("NOT_FOUND", "Lesson run not found");
    if (
      error.hint === "QUIZ_NOT_FINISHED" ||
      error.hint === "DIALOGUE_NOT_FINISHED" ||
      error.hint === "TASK_NOT_GRADED"
    )
      throw new LearnError(error.hint, error.message);
    throw error;
  }
  const r = data as {
    passed: boolean;
    pct: number;
    stars: number;
    xp: number;
    first: boolean;
    unit_completed: boolean;
    award: {
      xp_total: number;
      streak: number;
      day_xp: number;
      daily_goal: number;
      goal_met_now: boolean;
    } | null;
  };
  return {
    passed: r.passed,
    pct: r.pct,
    stars: r.stars,
    xp: r.xp,
    first: r.first,
    unitCompleted: r.unit_completed,
    totals: r.award
      ? {
          xpTotal: r.award.xp_total,
          streak: r.award.streak,
          todayXp: r.award.day_xp,
          dailyGoal: r.award.daily_goal,
          goalMetNow: r.award.goal_met_now,
        }
      : null,
    next: await nextUp(db, userId),
  };
}

// ----- exams: unit test-out and stage checkpoint -----

async function unitQuestionPool(db: SupabaseClient, unitIds: number[]) {
  const { data, error } = await db
    .from("lesson_questions")
    .select("question_id, lessons!inner(unit_id), questions!inner(status, type)")
    .in("lessons.unit_id", unitIds)
    .eq("questions.status", "published");
  if (error) throw error;
  const seen = new Set<string>();
  return (data ?? [])
    .map((r) => ({
      id: r.question_id as string,
      type: (r.questions as unknown as { type: string }).type,
    }))
    .filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
}

/** Round-robin over question types so an exam isn't eight of the same kind. */
function mixedSample(pool: { id: string; type: string }[], size: number) {
  const byType = new Map<string, string[]>();
  for (const q of shuffle(pool)) byType.set(q.type, [...(byType.get(q.type) ?? []), q.id]);
  const ids: string[] = [];
  while (ids.length < size && [...byType.values()].some((l) => l.length))
    for (const list of byType.values())
      if (list.length && ids.length < size) ids.push(list.shift()!);
  return ids;
}

export async function startTestOut(
  db: SupabaseClient,
  userId: string,
  unitId: number,
): Promise<ExamStart> {
  const path = await loadPath(db, userId);
  const found = findUnit(path.stages, unitId);
  if (!found) throw new LearnError("NOT_FOUND", "Unit not found");
  if (found.unit.state === "completed") throw new LearnError("ALREADY_DONE", "Unit already done");
  if (found.unit.state !== "available" && found.unit.state !== "in_progress")
    throw new LearnError("LOCKED", "This unit is not open yet");
  const ids = mixedSample(await unitQuestionPool(db, [unitId]), TEST_OUT_SIZE);
  if (ids.length < 4) throw new LearnError("EMPTY", "Not enough questions to test out yet");
  const s = await createSession(db, userId, {
    kind: "test_out",
    ref: `unit:${unitId}`,
    questionIds: ids,
  });
  return { sessionId: s.id, total: s.planned_count, passPct: 80 };
}

export async function finishTestOut(
  db: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ExamResult> {
  const r = await examRpc(db, "svc_test_out_unit", userId, sessionId);
  return { passed: r.passed, pct: r.pct, next: await nextUp(db, userId) };
}

export async function startCheckpoint(
  db: SupabaseClient,
  userId: string,
  stageId: number,
): Promise<ExamStart> {
  const path = await loadPath(db, userId);
  const stage = path.stages.find((s) => s.id === stageId);
  if (!stage) throw new LearnError("NOT_FOUND", "Stage not found");
  if (stage.checkpoint.state !== "available" && stage.checkpoint.state !== "passed")
    throw new LearnError("LOCKED", "Finish every unit of this stage first");
  const pool = await unitQuestionPool(
    db,
    stage.units.filter((u) => u.state !== "coming_soon").map((u) => u.id),
  );
  const ids = mixedSample(pool, stage.checkpoint.size);
  if (ids.length < 4) throw new LearnError("EMPTY", "Not enough questions for a checkpoint yet");
  const s = await createSession(db, userId, {
    kind: "checkpoint",
    ref: `stage:${stageId}`,
    questionIds: ids,
  });
  return { sessionId: s.id, total: s.planned_count, passPct: stage.checkpoint.passPct };
}

export async function finishCheckpoint(
  db: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ExamResult> {
  const r = await examRpc(db, "svc_pass_checkpoint", userId, sessionId);
  return {
    passed: r.passed,
    pct: r.pct,
    certificateId: r.certificate_id ?? null,
    next: await nextUp(db, userId),
  };
}

async function examRpc(db: SupabaseClient, fn: string, userId: string, sessionId: string) {
  const { data, error } = await db.rpc(fn, { p_user: userId, p_session: sessionId });
  if (error) {
    if (error.code === "P0002") throw new LearnError("NOT_FOUND", "Exam not found");
    if (error.hint === "QUIZ_NOT_FINISHED")
      throw new LearnError("QUIZ_NOT_FINISHED", "Finish all questions first");
    throw error;
  }
  return data as { passed: boolean; pct: number; certificate_id?: string | null };
}

// ----- placement (once, at onboarding) -----

export async function startPlacement(db: SupabaseClient, userId: string): Promise<ExamStart> {
  const { data: p } = await db.from("profiles").select("placement_level").eq("id", userId).single();
  if (p?.placement_level) throw new LearnError("ALREADY_DONE", "Placement already done");
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
  const s = await createSession(db, userId, { kind: "placement", questionIds: ids });
  return { sessionId: s.id, total: s.planned_count, passPct: 0 };
}

/** Score by band: 3/4 at B1 → stage 2; 3/4 at B1 and B2 → stage 3 (or the furthest published). */
export function placementBand(correctByCefr: Record<string, number>): "A2" | "B1" | "B2" {
  const b1 = correctByCefr.B1 ?? 0;
  const b2 = correctByCefr.B2 ?? 0;
  if (b1 >= 3 && b2 >= 3) return "B2";
  if (b1 >= 3) return "B1";
  return "A2";
}

export async function finishPlacement(db: SupabaseClient, userId: string, sessionId: string) {
  const { data: s } = await db
    .from("quiz_sessions")
    .select("user_id, kind, finished_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s || s.user_id !== userId || s.kind !== "placement")
    throw new LearnError("NOT_FOUND", "Session not found");
  if (!s.finished_at) throw new LearnError("QUIZ_NOT_FINISHED", "Finish all questions first");
  const { data: answers } = await db
    .from("question_deliveries")
    .select("correct, questions(cefr)")
    .eq("session_id", sessionId);
  const correct: Record<string, number> = {};
  for (const a of answers ?? []) {
    const cefr = (a.questions as unknown as { cefr: string }).cefr;
    if (a.correct) correct[cefr] = (correct[cefr] ?? 0) + 1;
  }
  const band = placementBand(correct);
  const path = await loadPath(db, userId);
  const unit = placementUnit(path.stages, band);
  if (!unit) throw new LearnError("EMPTY", "No published units yet");
  const { error } = await db.rpc("svc_place_user", {
    p_user: userId,
    p_unit: unit.id,
    p_cefr: band,
  });
  if (error) {
    if (error.hint === "ALREADY_DONE")
      throw new LearnError("ALREADY_DONE", "Placement already done");
    throw error;
  }
  return { band, correct, unit: { id: unit.id, code: unit.code, title: unit.title } };
}

/** Skip placement: start at the very beginning (still recorded so it isn't offered again). */
export async function skipPlacement(db: SupabaseClient, userId: string) {
  const path = await loadPath(db, userId);
  const unit = placementUnit(path.stages, "A2");
  if (!unit) throw new LearnError("EMPTY", "No published units yet");
  const { error } = await db.rpc("svc_place_user", {
    p_user: userId,
    p_unit: unit.id,
    p_cefr: "A2",
  });
  if (error && error.hint !== "ALREADY_DONE") throw error;
  return { band: "A2" as const, unit: { id: unit.id, code: unit.code, title: unit.title } };
}

export async function saveOnboarding(
  db: SupabaseClient,
  userId: string,
  input: { dailyGoal: 10 | 20 | 30 | 50; reason: string; displayName?: string },
) {
  const { error } = await db
    .from("profiles")
    .update({
      daily_goal_xp: input.dailyGoal,
      goal_reason: input.reason,
      ...(input.displayName ? { display_name: input.displayName } : {}),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}
