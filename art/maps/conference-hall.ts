import { rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(36, 24, ".");

const seats = (y: number) =>
  [8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 26, 27].map((x) => ({
    prefab: P.chairFacingUp,
    x,
    y,
  }));

const spec: MapSpec = {
  key: "conference-hall",
  grid: toRows(g),
  place: [
    { prefab: P.elevator, x: 2, y: 1 },
    { prefab: P.projectorScreen, x: 17, y: 2 },
    { prefab: P.rug(14, 4, "orange"), x: 11, y: 3 },
    ...seats(10),
    ...seats(12),
    ...seats(14),
    { prefab: P.roundTable, x: 4, y: 18 },
    { prefab: P.roundTable, x: 31, y: 18 },
    { prefab: P.coffeeMachine, x: 33, y: 3 },
    { prefab: P.plant, x: 1, y: 22 },
    { prefab: P.plant, x: 34, y: 22 },
  ],
  spawns: { default: [3, 4], "from-elevator": [3, 4] },
  npcs: [
    { npcId: "robert", x: 16, y: 5, facing: "down", behavior: "idle" },
    { npcId: "attendee-a", x: 6, y: 17, facing: "right", behavior: "wander", wanderRadius: 2 },
    { npcId: "attendee-b", x: 29, y: 17, facing: "left", behavior: "wander", wanderRadius: 2 },
  ],
  doors: [],
  interactables: [
    { x: 2, y: 2, w: 2, h: 1, objectId: "elevator", kind: "elevator", label: "Elevator" },
    { x: 17, y: 2, w: 2, h: 1, objectId: "stage-screen", kind: "demoScreen", label: "Stage" },
  ],
};

export default spec;
