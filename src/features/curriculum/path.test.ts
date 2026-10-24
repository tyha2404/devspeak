import { describe, expect, it } from "vitest";
import {
  buildPath,
  placementUnit,
  starsFor,
  type LearnerProgress,
  type LessonRow,
  type StageRow,
  type UnitRow,
} from "./path";

const stage = (id: number, sort: number): StageRow => ({
  id,
  slug: `s${id}`,
  sort,
  cefr: "A2",
  title_en: "S",
  title_vi: "S",
  tagline_vi: "",
  checkpoint_size: 12,
  checkpoint_pass_pct: 70,
});
const unit = (id: number, stageId: number, sort: number, status = "published"): UnitRow => ({
  id,
  stage_id: stageId,
  slug: `u${id}`,
  sort,
  code: `S${id}`,
  kind: "situation",
  cefr: "A2",
  character: "linh",
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
  kind: "practice",
  title_en: "L",
  title_vi: "L",
  est_minutes: 5,
  xp: 10,
});

const STAGES = [stage(2, 2), stage(1, 1)];
// Stage 1: u1 (l11, l12), u2 draft, u3 (l31). Stage 2: u4 (l41).
const UNITS = [unit(3, 1, 3), unit(1, 1, 1), unit(2, 1, 2, "draft"), unit(4, 2, 1)];
const LESSONS = [lesson(12, 1, 2), lesson(11, 1, 1), lesson(31, 3, 1), lesson(41, 4, 1)];
const empty = (): LearnerProgress => ({
  lessons: new Map(),
  units: new Map(),
  certificates: new Map(),
});

describe("buildPath", () => {
  it("opens only the first lesson of the first unit for a new learner", () => {
    const { stages, next } = buildPath(STAGES, UNITS, LESSONS, empty());
    expect(stages.map((s) => s.id)).toEqual([1, 2]);
    const [u1, u2, u3] = stages[0]!.units;
    expect([u1!.state, u2!.state, u3!.state]).toEqual(["available", "coming_soon", "locked"]);
    expect(u1!.lessons.map((l) => l.state)).toEqual(["available", "locked"]);
    expect(next).toEqual({ type: "lesson", stageId: 1, unitId: 1, lessonId: 11 });
  });

  it("unlocks lessons in order and skips draft units", () => {
    const p = empty();
    p.lessons.set(11, { stars: 2, completed: true });
    let r = buildPath(STAGES, UNITS, LESSONS, p);
    expect(r.stages[0]!.units[0]!.state).toBe("in_progress");
    expect(r.next?.lessonId).toBe(12);

    p.lessons.set(12, { stars: 3, completed: true });
    p.units.set(1, "lessons");
    r = buildPath(STAGES, UNITS, LESSONS, p);
    expect(r.stages[0]!.units[0]!.stars).toBe(5);
    expect(r.stages[0]!.units[2]!.state).toBe("available"); // u3, past the draft u2
    expect(r.next?.lessonId).toBe(31);
  });

  it("offers the checkpoint only when a fully published stage is done", () => {
    const p = empty();
    p.units.set(1, "lessons");
    p.units.set(3, "test_out");
    const r = buildPath(STAGES, UNITS, LESSONS, p);
    // Stage 1 still has a draft unit, so its checkpoint is not ready yet.
    expect(r.stages[0]!.checkpoint.state).toBe("coming_soon");
    expect(r.stages[0]!.progress).toEqual({ done: 2, total: 2 });
    expect(r.stages[1]!.units[0]!.state).toBe("available");

    const published = UNITS.map((u) => ({ ...u, status: "published" }));
    p.units.set(2, "lessons");
    const r2 = buildPath(STAGES, published, LESSONS, p);
    expect(r2.stages[0]!.checkpoint.state).toBe("available");
    // Next stays on the open lesson before offering the checkpoint of a later stage.
    expect(r2.next).toEqual({ type: "checkpoint", stageId: 1, unitId: null, lessonId: null });
  });

  it("treats a completed unit's lessons as open for replay", () => {
    const p = empty();
    p.units.set(1, "placement");
    const r = buildPath(STAGES, UNITS, LESSONS, p);
    expect(r.stages[0]!.units[0]!.lessons.map((l) => l.state)).toEqual(["available", "available"]);
    expect(r.stages[0]!.units[0]!.completedVia).toBe("placement");
  });
});

describe("helpers", () => {
  it("scores stars like the database", () => {
    expect([starsFor(59), starsFor(60), starsFor(75), starsFor(90)]).toEqual([0, 1, 2, 3]);
  });

  it("places learners at the first published unit of their band", () => {
    const { stages } = buildPath(STAGES, UNITS, LESSONS, empty());
    expect(placementUnit(stages, "A2")?.id).toBe(1);
    expect(placementUnit(stages, "B1")?.id).toBe(4);
    expect(placementUnit(stages, "B2")?.id).toBe(4); // no stage 3 yet → closest earlier stage
  });
});
