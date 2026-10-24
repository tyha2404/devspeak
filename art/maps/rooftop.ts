import { rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(24, 16, ":");

const spec: MapSpec = {
  key: "rooftop",
  grid: toRows(g),
  place: [
    { prefab: P.elevator, x: 2, y: 1 },
    { prefab: P.rug(8, 5), x: 8, y: 6 },
    { prefab: P.sofa, x: 9, y: 7 },
    { prefab: P.sofa, x: 12, y: 7 },
    { prefab: P.roundTable, x: 11, y: 9 },
    ...[1, 4, 7, 16, 19, 22].map((x) => ({ prefab: P.plant, x, y: 3 })),
    ...[1, 6, 17, 22].map((x) => ({ prefab: P.plantSmall, x, y: 14 })),
  ],
  spawns: { default: [3, 4], "from-elevator": [3, 4] },
  npcs: [{ npcId: "mentee", x: 14, y: 10, facing: "left", behavior: "wander", wanderRadius: 2 }],
  doors: [],
  interactables: [
    { x: 2, y: 2, w: 2, h: 1, objectId: "elevator", kind: "elevator", label: "Elevator" },
  ],
};

export default spec;
