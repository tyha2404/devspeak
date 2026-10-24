import { describe, expect, it } from "vitest";
import {
  buildPath,
  starsFor,
  trackNext,
  type LearnerProgress,
  type LessonRow,
  type StageRow,
  type Track,
  type UnitRow,
} from "./path";

const stage = (id: number, sort: number, track: Track): StageRow => ({
  id,
  slug: `s${id}`,
  sort,
  track,
  cefr: "A1",
  title_en: "S",
  title_vi: "S",
  tagline_vi: "",
});
const unit = (id: number, stageId: number, sort: number, status = "published"): UnitRow => ({
  id,
  stage_id: stageId,
  slug: `u${id}`,
  sort,
  code: `A${sort}`,
  cefr: "A1",
  title_en: "U",
  title_vi: "U",
  summary_vi: "",
  can_do: [],
  status,
});
const lesson = (id: number, unitId: number, sort: number): LessonRow => ({
  id,
  unit_id: unitId,
  slug: `l${id}`,
  sort,
  kind: "grammar",
  title_en: "L",
  title_vi: "L",
  est_minutes: 10,
  xp: 80,
});
const empty = (): LearnerProgress => ({ lessons: new Map(), units: new Map() });

// Grammar stage 1: levels u1 (l11, l12) → u2 (l21, l22) → u3 draft → u4 (l41).
// Vocab stage 2: topics u5 (l51), u6 (l61).
const STAGES = [stage(2, 20, "vocab"), stage(1, 10, "grammar")];
const UNITS = [
  unit(2, 1, 2),
  unit(1, 1, 1),
  unit(3, 1, 3, "draft"),
  unit(4, 1, 4),
  unit(5, 2, 1),
  unit(6, 2, 2),
];
const LESSONS = [
  lesson(12, 1, 2),
  lesson(11, 1, 1),
  lesson(21, 2, 1),
  lesson(22, 2, 2),
  lesson(41, 4, 1),
  lesson(51, 5, 1),
  lesson(61, 6, 1),
];

describe("buildPath", () => {
  it("opens only the first grammar lesson and every vocabulary topic for a new learner", () => {
    const [grammar, vocab] = buildPath(STAGES, UNITS, LESSONS, empty());
    expect(grammar!.units.map((u) => u.state)).toEqual([
      "available",
      "locked",
      "coming_soon",
      "locked",
    ]);
    expect(grammar!.units[0]!.lessons.map((l) => l.state)).toEqual(["available", "locked"]);
    expect(vocab!.units.map((u) => u.state)).toEqual(["available", "available"]);
    expect(trackNext(grammar!)).toEqual({ stageId: 1, unitId: 1, lessonId: 11 });
  });

  it("unlocks lessons in order and the next level once a level is done", () => {
    const p = empty();
    p.lessons.set(11, { stars: 2, completed: true });
    let [grammar] = buildPath(STAGES, UNITS, LESSONS, p);
    expect(grammar!.units[0]!.state).toBe("in_progress");
    expect(trackNext(grammar!)?.lessonId).toBe(12);

    p.lessons.set(12, { stars: 3, completed: true });
    p.units.set(1, "lessons");
    [grammar] = buildPath(STAGES, UNITS, LESSONS, p);
    expect(grammar!.units[0]!.stars).toBe(5);
    expect(grammar!.units[1]!.state).toBe("available");
    expect(grammar!.units[1]!.lessons.map((l) => l.state)).toEqual(["available", "locked"]);
  });

  it("a test-out opens the skipped level for replay and every lesson of the next level", () => {
    const p = empty();
    p.units.set(1, "test_out");
    const [grammar] = buildPath(STAGES, UNITS, LESSONS, p);
    expect(grammar!.units[0]!.lessons.map((l) => l.state)).toEqual(["available", "available"]);
    expect(grammar!.units[1]!.lessons.map((l) => l.state)).toEqual(["available", "available"]);
    // Draft levels are skipped: the level after u2 is still locked until u2 is done.
    expect(grammar!.units[3]!.state).toBe("locked");
  });
});

describe("helpers", () => {
  it("scores stars like the database", () => {
    expect([starsFor(79), starsFor(80), starsFor(90), starsFor(100)]).toEqual([0, 1, 2, 3]);
  });
});
