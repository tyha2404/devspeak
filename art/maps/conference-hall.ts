import { rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(28, 18, ".");

const seats = (y: number) =>
  [6, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20, 21].map((x) => ({
    prefab: P.chairFacingUp,
    x,
    y,
  }));

const spec: MapSpec = {
  key: "conference-hall",
  grid: toRows(g),
  place: [
    { prefab: P.elevator, x: 2, y: 1 },
    { prefab: P.projectorScreen, x: 13, y: 2 },
    { prefab: P.rug(12, 3, "orange"), x: 8, y: 3 },
    ...seats(8),
    ...seats(10),
    ...seats(12),
    { prefab: P.roundTable, x: 3, y: 14 },
    { prefab: P.roundTable, x: 24, y: 14 },
    { prefab: P.coffeeMachine, x: 25, y: 3 },
    { prefab: P.plant, x: 1, y: 16 },
    { prefab: P.plant, x: 26, y: 16 },
  ],
  spawns: { default: [3, 4], "from-elevator": [3, 4] },
  npcs: [
    { npcId: "robert", x: 12, y: 5, facing: "down", behavior: "idle" },
    { npcId: "attendee-a", x: 4, y: 13, facing: "right", behavior: "wander", wanderRadius: 2 },
    { npcId: "attendee-b", x: 23, y: 13, facing: "left", behavior: "wander", wanderRadius: 2 },
  ],
  doors: [],
  interactables: [
    { x: 2, y: 2, w: 2, h: 1, objectId: "elevator", kind: "elevator", label: "Elevator" },
    { x: 13, y: 2, w: 2, h: 1, objectId: "stage-screen", kind: "demoScreen", label: "Stage" },
  ],
};

export default spec;
