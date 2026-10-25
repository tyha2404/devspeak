import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { glossary } from "@/features/content/glossary";
import { createSession } from "@/features/quiz/service";
import type {
  ExamResult,
  ExamStart,
  Home,
  LessonContent,
  LessonResult,
  LessonStart,
  LessonView,
  NextUp,
  TrackSummary,
} from "@/lib/contracts/learn";
import { localDate } from "@/lib/time";
import { vocabQuestionSelection } from "./autoquiz";
import {
  buildPath,
  findLesson,
  findUnit,
  trackNext,
  type LearnerProgress,
  type LessonRow,
  type NextStep,
  type PathStage,
  type StageRow,
  type UnitRow,
} from "./path";

export class LearnError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "LOCKED" | "ALREADY_DONE" | "QUIZ_NOT_FINISHED" | "EMPTY",
    message: string,
  ) {
    super(message);
  }
}

/** A level test-out has 16 questions like a lesson test; passing it pays 120 XP. */
const TEST_OUT_SIZE = 16;
const TEST_OUT_XP = 120;
/** An unfinished run younger than this is resumed instead of starting a new one. */
const RESUME_MS = 2 * 3600_000;
/** Rows of the removed career path may still sit in the database; only these tracks show. */
const TRACKS = ["grammar", "vocab"] as const;

const shuffle = <T>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Shuffle within ForumFlash's difficulty bands (questions 1–5, 6–10, 11+), keeping band order. */
const shuffleBands = (ids: string[]) =>
  [ids.slice(0, 5), ids.slice(5, 10), ids.slice(10)].flatMap(shuffle);

// ----- roadmaps -----

export async function loadPath(db: SupabaseClient, userId: string): Promise<PathStage[]> {
  const { data: stages, error } = await db
    .from("stages")
    .select("id, slug, sort, track, cefr, title_en, title_vi, tagline_vi")
    .in("track", TRACKS);
  if (error) throw error;
  const stageIds = (stages ?? []).map((s) => s.id);
  const { data: units, error: uErr } = await db
    .from("units")
    .select("id, stage_id, slug, sort, code, cefr, title_en, title_vi, summary_vi, can_do, status")
    .in("stage_id", stageIds);
  if (uErr) throw uErr;
  const [lessons, lp, up] = await Promise.all([
    db
      .from("lessons")
      .select(
        "id, unit_id, slug, sort, kind, title_en, title_vi, est_minutes, xp, question_count, group:body->grammar->>group, senses:body->senses",
      )
      .in(
        "unit_id",
        (units ?? []).map((u) => u.id),
      ),
    db
      .from("user_lesson_progress")
      .select(
        "lesson_id, stars, completed_at, attempts, best_pct, last_pct, last_correct, last_total, last_at",
      )
      .eq("user_id", userId),
    db.from("user_unit_progress").select("unit_id, via").eq("user_id", userId),
  ]);
  for (const r of [lessons, lp, up]) if (r.error) throw r.error;
  const progress: LearnerProgress = {
    lessons: new Map(
      (lp.data ?? []).map((p) => [
        p.lesson_id,
        {
          stars: p.stars,
          completed: !!p.completed_at,
          history: {
            attempts: p.attempts,
            bestPct: p.best_pct,
            lastPct: p.last_pct,
            lastCorrect: p.last_correct,
            lastTotal: p.last_total,
            lastAt: p.last_at,
          },
        },
      ]),
    ),
    units: new Map((up.data ?? []).map((u) => [u.unit_id, u.via])),
  };
  return buildPath(
    stages as StageRow[],
    (units ?? []) as UnitRow[],
    (lessons.data ?? []) as LessonRow[],
    progress,
  );
}

function describeNext(stages: PathStage[], next: NextStep | null): NextUp | null {
  if (!next) return null;
  const stage = stages.find((s) => s.id === next.stageId)!;
  const unit = stage.units.find((u) => u.id === next.unitId)!;
  const i = unit.lessons.findIndex((l) => l.id === next.lessonId);
  const lesson = unit.lessons[i]!;
  return {
    stage: { id: stage.id, title: stage.title, cefr: stage.cefr },
    unit: { id: unit.id, code: unit.code, title: unit.title },
    lesson: { id: lesson.id, title: lesson.title, kind: lesson.kind, minutes: lesson.minutes },
    index: i + 1,
    total: unit.lessons.length,
  };
}

export async function home(
  db: SupabaseClient,
  userId: string,
  isGuest: boolean,
  email: string | null = null,
): Promise<Home> {
  const { data: p, error } = await db
    .from("profiles")
    .select(
      "display_name, xp_total, streak_current, streak_last_date, streak_freezes, daily_goal_xp, timezone",
    )
    .eq("id", userId)
    .single();
  if (error) throw error;
  const today = localDate(new Date(), p.timezone);
  const [stages, { data: day }, { count: due }] = await Promise.all([
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
  const tracks = stages.map((s): TrackSummary => {
    const lessons = s.units.filter((u) => u.state !== "coming_soon").flatMap((u) => u.lessons);
    return {
      track: s.track,
      stageId: s.id,
      title: s.title,
      tagline: s.tagline,
      units: s.units.length,
      lessons: {
        done: lessons.filter((l) => l.state === "completed").length,
        total: lessons.length,
      },
      next: describeNext(stages, trackNext(s)),
    };
  });
  const published = stages.flatMap((s) =>
    s.units.filter((u) => u.state !== "coming_soon").map((u) => ({ track: s.track, u })),
  );
  // Every lesson's best-pass XP, plus each grammar level's test-out bonus.
  const maxXp =
    published.flatMap(({ u }) => u.lessons).reduce((n, l) => n + l.xp, 0) +
    published.filter(({ track }) => track === "grammar").length * TEST_OUT_XP;
  return {
    me: {
      displayName: p.display_name,
      isGuest,
      email,
      xpTotal: p.xp_total,
      streak: alive ? p.streak_current : 0,
      streakFreezes: p.streak_freezes,
      dailyGoal: p.daily_goal_xp,
      todayXp: day?.xp ?? 0,
    },
    srsDue: due ?? 0,
    tracks,
    growth: { xp: p.xp_total, max: maxXp },
  };
}

/** The next open lesson in the track of the given lesson or unit. */
async function nextUp(
  db: SupabaseClient,
  userId: string,
  from: { lessonId?: number; unitId?: number },
) {
  const stages = await loadPath(db, userId);
  const stage = from.lessonId
    ? findLesson(stages, from.lessonId)?.stage
    : from.unitId
      ? findUnit(stages, from.unitId)?.stage
      : undefined;
  return stage ? describeNext(stages, trackNext(stage)) : null;
}

// ----- lessons -----

async function openLesson(db: SupabaseClient, userId: string, lessonId: number) {
  const found = findLesson(await loadPath(db, userId), lessonId);
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
    .select("kind, body, question_count, pass_pct")
    .eq("id", lessonId)
    .single();
  if (error) throw error;
  const body = row.body as { senses?: string[]; grammar?: unknown };
  let content: LessonContent;
  if (row.kind === "vocab") {
    const slugs = body.senses ?? [];
    const g = await glossary(db, slugs);
    content = { kind: "vocab", words: slugs.map((s) => g[s]).filter((w) => !!w) };
  } else {
    content = { kind: "grammar", grammar: body.grammar as never };
  }
  return {
    id: lesson.id,
    slug: lesson.slug,
    kind: content.kind,
    title: lesson.title,
    minutes: lesson.minutes,
    xp: lesson.xp,
    questionCount: row.question_count,
    passPct: row.pass_pct,
    stars: lesson.stars,
    completed: lesson.state === "completed",
    unit: { id: unit.id, code: unit.code, title: unit.title },
    stage: { id: stage.id, title: stage.title, track: stage.track },
    index: unit.lessons.findIndex((l) => l.id === lesson.id) + 1,
    total: unit.lessons.length,
    content,
  };
}

/** Start (or resume) a lesson: a timed quiz session over its 16 questions; word sets go to review. */
export async function startLesson(
  db: SupabaseClient,
  userId: string,
  lessonId: number,
): Promise<LessonStart> {
  await openLesson(db, userId, lessonId);
  const { data: l, error } = await db
    .from("lessons")
    .select("id, kind, body, question_count")
    .eq("id", lessonId)
    .single();
  if (error) throw error;

  const { data: open } = await db
    .from("lesson_runs")
    .select("id, quiz_session_id, started_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .is("finished_at", null)
    .gt("started_at", new Date(Date.now() - RESUME_MS).toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) return { runId: open.id, sessionId: open.quiz_session_id };

  const { data: qs, error: qErr } = await db
    .from("lesson_questions")
    .select("question_id, sort, questions!inner(status)")
    .eq("lesson_id", lessonId)
    .eq("questions.status", "published")
    .order("sort");
  if (qErr) throw qErr;
  let bank = (qs ?? []).map((q) => q.question_id as string);
  if (l.kind === "vocab") {
    const { count, error: attemptsError } = await db
      .from("lesson_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .not("finished_at", "is", null);
    if (attemptsError) throw attemptsError;
    bank = vocabQuestionSelection(bank, count ?? 0);
  }
  const ids = shuffleBands(bank);
  if (!ids.length) throw new LearnError("EMPTY", "This lesson has no questions yet");
  const session = await createSession(db, userId, {
    kind: "lesson",
    ref: `lesson:${lessonId}`,
    questionIds: ids,
    strict: true,
  });

  if (l.kind === "vocab") {
    const slugs = (l.body as { senses: string[] }).senses;
    const { data: senses } = await db.from("senses").select("id").in("slug", slugs);
    for (const s of senses ?? [])
      await db.rpc("svc_add_card", { p_user: userId, p_sense: s.id, p_via: "lesson" });
  }

  const { data: run, error: runErr } = await db
    .from("lesson_runs")
    .insert({ user_id: userId, lesson_id: lessonId, quiz_session_id: session.id })
    .select("id")
    .single();
  if (runErr) throw runErr;
  return { runId: run.id, sessionId: session.id };
}

export async function completeLesson(
  db: SupabaseClient,
  userId: string,
  runId: string,
): Promise<LessonResult> {
  const { data: run } = await db
    .from("lesson_runs")
    .select("lesson_id")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  const { data, error } = await db.rpc("svc_complete_lesson", { p_user: userId, p_run: runId });
  if (error) {
    if (error.code === "P0002") throw new LearnError("NOT_FOUND", "Lesson run not found");
    if (error.hint === "QUIZ_NOT_FINISHED")
      throw new LearnError("QUIZ_NOT_FINISHED", error.message);
    throw error;
  }
  const r = data as {
    passed: boolean;
    pct: number;
    stars: number;
    xp: number;
    first: boolean;
    unit_completed: boolean;
    correct: number | null;
    total: number | null;
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
    correct: r.correct,
    total: r.total,
    totals: r.award
      ? {
          xpTotal: r.award.xp_total,
          streak: r.award.streak,
          todayXp: r.award.day_xp,
          dailyGoal: r.award.daily_goal,
          goalMetNow: r.award.goal_met_now,
        }
      : null,
    next: run ? await nextUp(db, userId, { lessonId: run.lesson_id }) : null,
  };
}

// ----- level test-out -----

async function unitQuestionPool(db: SupabaseClient, unitId: number) {
  const { data, error } = await db
    .from("lesson_questions")
    .select("question_id, lessons!inner(unit_id), questions!inner(status, type)")
    .eq("lessons.unit_id", unitId)
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

/** Round-robin over question types so a test isn't sixteen of the same kind. */
function mixedSample(pool: { id: string; type: string }[], size: number) {
  const byType = new Map<string, string[]>();
  for (const q of shuffle(pool)) byType.set(q.type, [...(byType.get(q.type) ?? []), q.id]);
  const ids: string[] = [];
  while (ids.length < size && [...byType.values()].some((l) => l.length))
    for (const list of byType.values())
      if (list.length && ids.length < size) ids.push(list.shift()!);
  return ids;
}

/** A level test-out can be retaken after passing (it pays again), as on ForumFlash. */
export async function startTestOut(
  db: SupabaseClient,
  userId: string,
  unitId: number,
): Promise<ExamStart> {
  const found = findUnit(await loadPath(db, userId), unitId);
  if (!found) throw new LearnError("NOT_FOUND", "Unit not found");
  if (found.unit.state === "locked" || found.unit.state === "coming_soon")
    throw new LearnError("LOCKED", "This unit is not open yet");
  const ids = mixedSample(await unitQuestionPool(db, unitId), TEST_OUT_SIZE);
  if (ids.length < 4) throw new LearnError("EMPTY", "Not enough questions to test out yet");
  const s = await createSession(db, userId, {
    kind: "test_out",
    ref: `unit:${unitId}`,
    questionIds: ids,
    strict: true,
  });
  return { sessionId: s.id, total: s.planned_count, passPct: 80 };
}

export async function finishTestOut(
  db: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<ExamResult> {
  const { data, error } = await db.rpc("svc_test_out_unit", {
    p_user: userId,
    p_session: sessionId,
  });
  if (error) {
    if (error.code === "P0002") throw new LearnError("NOT_FOUND", "Test not found");
    if (error.hint === "QUIZ_NOT_FINISHED")
      throw new LearnError("QUIZ_NOT_FINISHED", "Finish all questions first");
    throw error;
  }
  const r = data as {
    passed: boolean;
    pct: number;
    unit_id: number;
    xp: number;
    correct: number;
    total: number;
  };
  return {
    passed: r.passed,
    pct: r.pct,
    xp: r.xp ?? 0,
    correct: r.correct,
    total: r.total,
    next: await nextUp(db, userId, { unitId: r.unit_id }),
  };
}
