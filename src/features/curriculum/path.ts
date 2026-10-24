// Pure learning-path logic: which units and lessons are open, done or locked, and what's next.
// Career units unlock in order (stage sort, then unit sort), skipping drafts ("coming soon"); lessons
// inside an open unit unlock one after another. Checkpoints open once a stage's units are done.
// Study tracks are separate: grammar levels unlock one after another inside their stage (or by
// test-out), vocabulary topics are all open; neither has a checkpoint or feeds the career "next".

export type Track = "career" | "grammar" | "vocab";

export interface StageRow {
  id: number;
  slug: string;
  sort: number;
  track: Track;
  cefr: string;
  title_en: string;
  title_vi: string;
  tagline_vi: string;
  checkpoint_size: number;
  checkpoint_pass_pct: number;
}
export interface UnitRow {
  id: number;
  stage_id: number;
  slug: string;
  sort: number;
  code: string;
  kind: "situation" | "knowledge" | "grammar" | "topic";
  cefr: string;
  character: string;
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
  certificates: Map<number, { id: string; score: number }>;
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
  kind: UnitRow["kind"];
  cefr: string;
  character: string;
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
  checkpoint: {
    state: "locked" | "available" | "passed" | "coming_soon" | "none";
    size: number;
    passPct: number;
    certificateId: string | null;
  };
  /** Completed published units / published units. */
  progress: { done: number; total: number };
}
export interface NextStep {
  type: "lesson" | "checkpoint";
  stageId: number;
  unitId: number | null;
  lessonId: number | null;
}

export function buildPath(
  stages: StageRow[],
  units: UnitRow[],
  lessons: LessonRow[],
  progress: LearnerProgress,
): { stages: PathStage[]; next: NextStep | null } {
  const byUnit = new Map<number, LessonRow[]>();
  for (const l of [...lessons].sort((a, b) => a.sort - b.sort))
    byUnit.set(l.unit_id, [...(byUnit.get(l.unit_id) ?? []), l]);

  const orderedStages = [...stages].sort((a, b) => a.sort - b.sort);
  const stageSort = new Map(orderedStages.map((s) => [s.id, s.sort]));
  const ordered = [...units].sort(
    (a, b) => stageSort.get(a.stage_id)! - stageSort.get(b.stage_id)! || a.sort - b.sort,
  );

  // Walk published units in order: each opens when the previous one is done. Career units form
  // one chain across stages; each study-track stage starts its own chain (vocab: everything open).
  const trackOf = new Map(orderedStages.map((s) => [s.id, s.track]));
  const chainDone = new Map<string, boolean>();
  const chainVia = new Map<string, string | null>();
  const unitViews = new Map<number, PathUnit>();
  for (const u of ordered) {
    const track = trackOf.get(u.stage_id) ?? "career";
    const chain = track === "career" ? "career" : `stage:${u.stage_id}`;
    const previousDone = track === "vocab" || (chainDone.get(chain) ?? true);
    // A study-track test-out opens every lesson of the level after it, not just the first.
    const allOpen = track !== "career" && chainVia.get(chain) === "test_out";
    const rows = byUnit.get(u.id) ?? [];
    const via = progress.units.get(u.id) ?? null;
    let state: UnitState;
    if (u.status !== "published") state = "coming_soon";
    else if (via) state = "completed";
    else if (!previousDone) state = "locked";
    else
      state = rows.some((l) => progress.lessons.get(l.id)?.completed) ? "in_progress" : "available";
    if (u.status === "published") {
      chainDone.set(chain, state === "completed");
      chainVia.set(chain, via);
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
    unitViews.set(u.id, {
      id: u.id,
      slug: u.slug,
      code: u.code,
      kind: u.kind,
      cefr: u.cefr,
      character: u.character,
      title: { en: u.title_en, vi: u.title_vi },
      summary: u.summary_vi,
      canDo: u.can_do,
      state,
      completedVia: via,
      lessons: lessonViews,
      stars: lessonViews.reduce((n, l) => n + l.stars, 0),
      maxStars: lessonViews.length * 3,
      minutes: lessonViews.reduce((n, l) => n + l.minutes, 0),
    });
  }

  const stageViews = orderedStages.map((s): PathStage => {
    const su = ordered.filter((u) => u.stage_id === s.id).map((u) => unitViews.get(u.id)!);
    const published = su.filter((u) => u.state !== "coming_soon");
    const done = published.filter((u) => u.state === "completed").length;
    const cert = progress.certificates.get(s.id) ?? null;
    const comingSoon = published.length === 0 || published.length < su.length;
    return {
      id: s.id,
      slug: s.slug,
      cefr: s.cefr,
      title: { en: s.title_en, vi: s.title_vi },
      tagline: s.tagline_vi,
      units: su,
      track: s.track,
      checkpoint: {
        state:
          s.track !== "career"
            ? "none"
            : cert
              ? "passed"
              : comingSoon
                ? "coming_soon"
                : done === published.length
                  ? "available"
                  : "locked",
        size: s.checkpoint_size,
        passPct: s.checkpoint_pass_pct,
        certificateId: cert?.id ?? null,
      },
      progress: { done, total: published.length },
    };
  });

  return { stages: stageViews, next: nextStep(stageViews) };
}

/** The first open lesson along the career path, or an open checkpoint once a stage's units are done. */
export function nextStep(stages: PathStage[]): NextStep | null {
  for (const s of stages) {
    if (s.track !== "career") continue;
    for (const u of s.units) {
      if (u.state !== "available" && u.state !== "in_progress") continue;
      const l = u.lessons.find((x) => x.state === "available");
      if (l) return { type: "lesson", stageId: s.id, unitId: u.id, lessonId: l.id };
    }
    if (s.checkpoint.state === "available")
      return { type: "checkpoint", stageId: s.id, unitId: null, lessonId: null };
  }
  return null;
}

/** The first open lesson in a study-track stage (first unfinished level / topic). */
export function trackNext(stage: PathStage): NextStep | null {
  for (const u of stage.units) {
    if (u.state !== "available" && u.state !== "in_progress") continue;
    const l = u.lessons.find((x) => x.state === "available");
    if (l) return { type: "lesson", stageId: stage.id, unitId: u.id, lessonId: l.id };
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

/** Stars for a lesson score (mirrors private.complete_lesson). */
export const starsFor = (pct: number, passPct = 60) =>
  pct < passPct ? 0 : pct >= 90 ? 3 : pct >= 75 ? 2 : 1;

/** Placement band → where to start: the first published unit of the target stage (or the closest earlier one). */
export function placementUnit(stages: PathStage[], cefr: "A2" | "B1" | "B2") {
  const targetSort = cefr === "B2" ? 3 : cefr === "B1" ? 2 : 1;
  const candidates = stages
    .filter((s) => s.track === "career")
    .slice(0, targetSort)
    .reverse();
  for (const s of candidates) {
    const u = s.units.find((x) => x.state !== "coming_soon");
    if (u) return u;
  }
  return null;
}
