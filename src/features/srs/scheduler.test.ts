import { describe, expect, it } from "vitest";
import { schedule, verificationTypes, type DbCard } from "./scheduler";

const fresh: DbCard = {
  state: "new",
  due: "2026-10-24T00:00:00Z",
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  last_review: null,
};
const now = new Date("2026-10-24T02:00:00Z");

describe("FSRS scheduling", () => {
  it("moves later for better ratings", () => {
    const again = schedule(fresh, 1, now, true).next;
    const good = schedule(fresh, 3, now, true).next;
    const easy = schedule(fresh, 4, now, true).next;
    expect(new Date(again.due).getTime()).toBeLessThanOrEqual(new Date(good.due).getTime());
    expect(new Date(good.due).getTime()).toBeLessThan(new Date(easy.due).getTime());
    expect(good.reps).toBe(1);
  });

  it("treats a failed verification as Again regardless of the self-rating", () => {
    const r = schedule(fresh, 4, now, false);
    expect(r.grade).toBe(1);
    expect(r.next.due).toBe(schedule(fresh, 1, now, true).next.due);
  });

  it("grows intervals with repeated good reviews", () => {
    let c = fresh;
    let t = now;
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      c = schedule(c, 3, t, true).next;
      gaps.push(new Date(c.due).getTime() - t.getTime());
      t = new Date(c.due);
    }
    expect(gaps[3]!).toBeGreaterThan(gaps[1]!);
  });

  it("picks harder question types for stronger memories", () => {
    expect(verificationTypes(0.5)).toContain("mcq_meaning");
    expect(verificationTypes(30)).toContain("error_correction");
  });
});
