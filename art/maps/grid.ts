/** Rectangular room: border '#', two wall-face rows under the top border, floor inside. */
export function rectRoom(w: number, h: number, floor: string): string[][] {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) return "#";
      if (y === 1 || y === 2) return "W";
      return floor;
    }),
  );
}

/** Open a gap in the border (doorway) by replacing cells with floor. */
export function carve(grid: string[][], x: number, y: number, w: number, h: number, floor: string) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) grid[yy]![xx] = floor;
}

export const toRows = (grid: string[][]) => grid.map((r) => r.join(""));
