// Client-facing shapes for the study tracks (home, roadmaps, lessons). No answer keys here.
import type { GrammarBody } from "@/features/curriculum/schema";

export type { GrammarBody } from "@/features/curriculum/schema";

export type {
  LessonHistory,
  LessonState,
  NextStep,
  PathLesson,
  PathStage,
  PathUnit,
  Track,
  UnitState,
} from "@/features/curriculum/path";

export interface Me {
  displayName: string | null;
  isGuest: boolean;
  xpTotal: number;
  streak: number;
  streakFreezes: number;
  dailyGoal: number;
  todayXp: number;
}

/** The next open lesson of a track. */
export interface NextUp {
  stage: { id: number; title: { en: string; vi: string }; cefr: string };
  unit: { id: number; code: string; title: { en: string; vi: string } };
  lesson: { id: number; title: { en: string; vi: string }; kind: string; minutes: number };
  /** Position inside the unit, e.g. lesson 3 of 7. */
  index: number;
  total: number;
}

/** A study track (grammar by level, vocabulary by topic) as shown on Home. */
export interface TrackSummary {
  track: "grammar" | "vocab";
  stageId: number;
  title: { en: string; vi: string };
  tagline: string;
  /** Units (levels / topics), including those still coming soon. */
  units: number;
  lessons: { done: number; total: number };
  next: NextUp | null;
}

export interface Home {
  me: Me;
  srsDue: number;
  tracks: TrackSummary[];
  /** XP towards the growth tree: the learner's total against all first-pass lesson XP. */
  growth: { xp: number; max: number };
}

export type LessonContent =
  { kind: "vocab"; words: GlossEntry[] } | { kind: "grammar"; grammar: GrammarBody };

export interface LessonView {
  id: number;
  slug: string;
  kind: LessonContent["kind"];
  title: { en: string; vi: string };
  minutes: number;
  xp: number;
  questionCount: number;
  /** Score needed to pass the lesson's test. */
  passPct: number;
  stars: number;
  completed: boolean;
  unit: { id: number; code: string; title: { en: string; vi: string } };
  stage: { id: number; title: { en: string; vi: string }; track: "grammar" | "vocab" };
  /** 1-based position in the unit and the unit's lesson count. */
  index: number;
  total: number;
  content: LessonContent;
}

export interface LessonStart {
  runId: string;
  sessionId: string | null;
}

export interface LessonResult {
  passed: boolean;
  pct: number;
  stars: number;
  xp: number;
  first: boolean;
  unitCompleted: boolean;
  /** Test score as counts. */
  correct: number | null;
  total: number | null;
  totals: {
    xpTotal: number;
    streak: number;
    todayXp: number;
    dailyGoal: number;
    goalMetNow: boolean;
  } | null;
  next: NextUp | null;
}

export interface ExamStart {
  sessionId: string;
  total: number;
  passPct: number;
}

export interface ExamResult {
  passed: boolean;
  pct: number;
  xp: number;
  correct: number;
  total: number;
  next: NextUp | null;
}

/** A word as shown on flashcards and in word lists. */
export interface GlossEntry {
  slug: string;
  lemma: string;
  pos: string;
  ipa: string | null;
  vi: string;
  def: string;
  note: string | null;
  example: { en: string; vi: string | null } | null;
}
