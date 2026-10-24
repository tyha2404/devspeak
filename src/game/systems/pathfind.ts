/** Grid BFS for tap-to-move (4-neighbour). Returns tile steps from start (exclusive) to goal, or null. */
export function findPath(
  solid: (x: number, y: number) => boolean,
  width: number,
  height: number,
  start: { x: number; y: number },
  goal: { x: number; y: number },
  maxNodes = 4000,
): { x: number; y: number }[] | null {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  if (!inside(goal.x, goal.y) || solid(goal.x, goal.y)) return null;
  const key = (x: number, y: number) => y * width + x;
  const prev = new Map<number, number>([[key(start.x, start.y), -1]]);
  const queue = [start];
  for (let i = 0; i < queue.length && prev.size < maxNodes; i++) {
    const cur = queue[i]!;
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: { x: number; y: number }[] = [];
      let k = key(cur.x, cur.y);
      while (k !== key(start.x, start.y)) {
        path.unshift({ x: k % width, y: Math.floor(k / width) });
        k = prev.get(k)!;
      }
      return path;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inside(nx, ny) || solid(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

/** A Date whose ICT wall-clock time is "HH:MM" today (for tests). */
export function ictClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h! - 7, m!, 0, 0);
  return d;
}

/** NPC schedules are in ICT ("HH:MM" ranges). */
export function inWindow(now: Date, from: string, to: string) {
  const ict = new Date(now.getTime() + 7 * 3600_000);
  const m = ict.getUTCHours() * 60 + ict.getUTCMinutes();
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return m >= fh! * 60 + fm! && m < th! * 60 + tm!;
}
