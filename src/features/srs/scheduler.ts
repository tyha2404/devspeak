import { fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";

// FSRS (ts-fsrs) with the plan's settings: 90% target retention, 1-year cap, short learning steps
// because the game is played in sessions.
const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    maximum_interval: 365,
    enable_fuzz: true,
    learning_steps: ["10m", "1d"],
  }),
);

export type DbState = "new" | "learning" | "review" | "relearning";
const TO_STATE: Record<DbState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};
const FROM_STATE: Record<number, DbState> = {
  0: "new",
  1: "learning",
  2: "review",
  3: "relearning",
};

export interface DbCard {
  state: DbState;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: string | null;
}

export type UiRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export function toCard(c: DbCard): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: TO_STATE[c.state],
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  };
}

/** Schedule the next review. A failed verification task always counts as "Again". */
export function schedule(c: DbCard, rating: UiRating, now: Date, verifiedCorrect: boolean | null) {
  const grade = (verifiedCorrect === false ? Rating.Again : rating) as Grade;
  const { card, log } = scheduler.next(toCard(c), now, grade);
  const next: DbCard = {
    state: FROM_STATE[card.state]!,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    last_review: now.toISOString(),
  };
  return { next, grade: grade as UiRating, log };
}

/** Preview intervals for the four buttons (shown under each button). */
export function previewIntervals(c: DbCard, now: Date): Record<UiRating, string> {
  const p = scheduler.repeat(toCard(c), now);
  const fmt = (d: Date) => {
    const mins = Math.round((d.getTime() - now.getTime()) / 60_000);
    if (mins < 60) return `${Math.max(1, mins)} phút`;
    if (mins < 1440) return `${Math.round(mins / 60)} giờ`;
    return `${Math.round(mins / 1440)} ngày`;
  };
  return {
    1: fmt(p[Rating.Again].card.due),
    2: fmt(p[Rating.Hard].card.due),
    3: fmt(p[Rating.Good].card.due),
    4: fmt(p[Rating.Easy].card.due),
  };
}

/** Which question types fit a card's memory strength (recognition → production). */
export function verificationTypes(stabilityDays: number) {
  if (stabilityDays < 2) return ["mcq_meaning", "listening"];
  if (stabilityDays <= 10) return ["fill_blank", "sentence_order", "mcq_meaning"];
  return ["error_correction", "reply_choice", "fill_blank"];
}
