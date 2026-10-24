// Pure roadmap logic for the study tracks: which units and lessons are open, done or locked.
// Grammar levels unlock one after another (or all at once after a passed test-out of the level
// before); vocabulary topics are all open. Inside an open unit, lessons unlock in order.
// Draft units are shown as "coming soon" and skipped.

export type Track = "grammar" | "vocab";

export interface StageRow {
  id: number;
  slug: string;
  sort: number;
  track: Track;
  cefr: string;
  title_en: string;
  title_vi: string;
  tagline_vi: string;
}
export interface UnitRow {
  id: number;
  stage_id: number;
  slug: string;
  sort: number;
  code: string;
  cefr: string;
  title_en: string;
  title_vi: string;
  summary_vi: string;
  can_do: string[];
  status: string;
}
export interface LessonRow {
  id: number;
  unit_id: number;
  slug: string;
  sort: number;
  kind: string;
  title_en: string;
  title_vi: string;
  est_minutes: number;
  xp: number;
  question_count?: number;
  /** Grammar point category ("Thì", "Từ loại"…) and a word set's size, for the lesson list. */
  group?: string | null;
  senses?: string[] | null;
}
/** The latest and best result of a lesson (shown on the lesson card). */
export interface LessonHistory {
  attempts: number;
  bestPct: number;
  lastPct: number | null;
  lastCorrect: number | null;
  lastTotal: number | null;
  lastAt: string;
}
export interface LearnerProgress {
  lessons: Map<number, { stars: number; completed: boolean; history?: LessonHistory }>;
  units: Map<number, "lessons" | "test_out" | "placement">;
}

export type LessonState = "locked" | "available" | "completed";
export type UnitState = "locked" | "available" | "in_progress" | "completed" | "coming_soon";

export interface PathLesson {
  id: number;
  slug: string;
  kind: string;
  title: { en: string; vi: string };
  minutes: number;
  xp: number;
  state: LessonState;
  stars: number;
  questionCount: number;
  history: LessonHistory | null;
  group: string | null;
  words: number;
}
export interface PathUnit {
  id: number;
  slug: string;
  code: string;
  cefr: string;
  title: { en: string; vi: string };
  summary: string;
  canDo: string[];
  state: UnitState;
  completedVia: "lessons" | "test_out" | "placement" | null;
  lessons: PathLesson[];
  stars: number;
  maxStars: number;
  minutes: number;
}
export interface PathStage {
  id: number;
  slug: string;
  track: Track;
  cefr: string;
  title: { en: string; vi: string };
  tagline: string;
  units: PathUnit[];
  /** Completed published units / published units. */
  progress: { done: number; total: number };
}
export interface NextStep {
  stageId: number;
  unitId: number;
  lessonId: number;
}

export function buildPath(
  stages: StageRow[],
  units: UnitRow[],
  lessons: LessonRow[],
  progress: LearnerProgress,
): PathStage[] {
  const byUnit = new Map<number, LessonRow[]>();
  for (const l of [...lessons].sort((a, b) => a.sort - b.sort))
    byUnit.set(l.unit_id, [...(byUnit.get(l.unit_id) ?? []), l]);

  return [...stages]
    .sort((a, b) => a.sort - b.sort)
    .map((s): PathStage => {
      // Walk the stage's published units in order: each grammar level opens when the previous
      // one is done; a test-out of the previous level also opens all of this level's lessons.
      let previousDone = true;
      let previousVia: string | null = null;
      const unitViews = units
        .filter((u) => u.stage_id === s.id)
        .sort((a, b) => a.sort - b.sort)
        .map((u): PathUnit => {
          const rows = byUnit.get(u.id) ?? [];
          const via = progress.units.get(u.id) ?? null;
          const chained = s.track === "grammar";
          const allOpen = chained && previousVia === "test_out";
          let state: UnitState;
          if (u.status !== "published") state = "coming_soon";
          else if (via) state = "completed";
          else if (chained && !previousDone) state = "locked";
          else
            state = rows.some((l) => progress.lessons.get(l.id)?.completed)
              ? "in_progress"
              : "available";
          if (u.status === "published") {
            previousDone = state === "completed";
            previousVia = via;
          }

          let prevLessonDone = true;
          const lessonViews = rows.map((l): PathLesson => {
            const p = progress.lessons.get(l.id);
            const done = !!p?.completed;
            const open =
              state === "completed" ||
              ((state === "available" || state === "in_progress") && (prevLessonDone || allOpen));
            prevLessonDone = done;
            return {
              id: l.id,
              slug: l.slug,
              kind: l.kind,
              title: { en: l.title_en, vi: l.title_vi },
              minutes: l.est_minutes,
              xp: l.xp,
              state: done ? "completed" : open ? "available" : "locked",
              stars: p?.stars ?? 0,
              questionCount: l.question_count ?? 0,
              history: p?.history ?? null,
              group: l.group ?? null,
              words: l.senses?.length ?? 0,
            };
          });
          return {
            id: u.id,
            slug: u.slug,
            code: u.code,
            cefr: u.cefr,
            title: { en: u.title_en, vi: u.title_vi },
            summary: u.summary_vi,
            canDo: u.can_do,
            state,
            completedVia: via,
            lessons: lessonViews,
            stars: lessonViews.reduce((n, l) => n + l.stars, 0),
            maxStars: lessonViews.length * 3,
            minutes: lessonViews.reduce((n, l) => n + l.minutes, 0),
          };
        });
      const published = unitViews.filter((u) => u.state !== "coming_soon");
      return {
        id: s.id,
        slug: s.slug,
        track: s.track,
        cefr: s.cefr,
        title: { en: s.title_en, vi: s.title_vi },
        tagline: s.tagline_vi,
        units: unitViews,
        progress: {
          done: published.filter((u) => u.state === "completed").length,
          total: published.length,
        },
      };
    });
}

/** The first open lesson of a track (first unfinished level / topic). */
export function trackNext(stage: PathStage): NextStep | null {
  for (const u of stage.units) {
    if (u.state !== "available" && u.state !== "in_progress") continue;
    const l = u.lessons.find((x) => x.state === "available");
    if (l) return { stageId: stage.id, unitId: u.id, lessonId: l.id };
  }
  return null;
}

export function findLesson(stages: PathStage[], lessonId: number) {
  for (const s of stages)
    for (const u of s.units) {
      const l = u.lessons.find((x) => x.id === lessonId);
      if (l) return { stage: s, unit: u, lesson: l };
    }
  return null;
}

export function findUnit(stages: PathStage[], unitId: number) {
  for (const s of stages) {
    const u = s.units.find((x) => x.id === unitId);
    if (u) return { stage: s, unit: u };
  }
  return null;
}

/** Stars for a test score (mirrors private.complete_lesson for study tracks). */
export const starsFor = (pct: number, passPct = 80) =>
  pct < passPct ? 0 : pct >= 100 ? 3 : pct >= 90 ? 2 : 1;
