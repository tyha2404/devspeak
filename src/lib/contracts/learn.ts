// Client-facing shapes for the learning path (home, path, lessons). No answer keys here.
import type { DialogueStep, GlossEntry } from "./dialogue";

export type {
  LessonState,
  NextStep,
  PathLesson,
  PathStage,
  PathUnit,
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
  onboarded: boolean;
  placementDone: boolean;
}

export interface NextUp {
  type: "lesson" | "checkpoint";
  stage: { id: number; title: { en: string; vi: string }; cefr: string };
  unit: { id: number; code: string; title: { en: string; vi: string }; character: string } | null;
  lesson: { id: number; title: { en: string; vi: string }; kind: string; minutes: number } | null;
  /** Position inside the unit, e.g. lesson 3 of 7. */
  index: number | null;
  total: number | null;
}

export interface Home {
  me: Me;
  next: NextUp | null;
  srsDue: number;
  /** Published units completed / published units, across the whole path. */
  overall: { done: number; total: number };
}

export interface MistakeItem {
  slug: string;
  kind: "grammar" | "word-choice" | "pronunciation" | "symbol" | "register";
  wrong: string | null;
  right: string;
  say: string | null;
  explanation: string;
}

export type LessonContent =
  | { kind: "vocab"; words: GlossEntry[] }
  | { kind: "dialogue" }
  | { kind: "focus"; markdown: string; examples: { en: string; vi?: string }[] }
  | {
      kind: "reading";
      passage: { text: string; source: string; url?: string; license: string; adapted: boolean };
    }
  | { kind: "practice" }
  | { kind: "listening" }
  | { kind: "mistakes"; items: MistakeItem[] }
  | {
      kind: "task";
      mode: "write" | "speak";
      context: { speaker: string; text: string }[];
      prompt: { en: string; vi: string };
    };

export interface LessonView {
  id: number;
  slug: string;
  kind: LessonContent["kind"];
  title: { en: string; vi: string };
  minutes: number;
  xp: number;
  questionCount: number;
  stars: number;
  completed: boolean;
  unit: { id: number; code: string; title: { en: string; vi: string }; character: string };
  stage: { id: number; title: { en: string; vi: string } };
  /** 1-based position in the unit and the unit's lesson count. */
  index: number;
  total: number;
  content: LessonContent;
}

export interface LessonStart {
  runId: string;
  sessionId: string | null;
  dialogue: DialogueStep | null;
}

export interface TaskResult {
  score: number;
  toneOk: boolean;
  feedback: string;
  fixes: { original: string; corrected: string }[];
  better: string;
  modelAnswer: string;
}

export interface LessonResult {
  passed: boolean;
  pct: number;
  stars: number;
  xp: number;
  first: boolean;
  unitCompleted: boolean;
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
  certificateId?: string | null;
  next: NextUp | null;
}
