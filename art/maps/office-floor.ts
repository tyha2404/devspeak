import { carve, rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

// Compact 30x20 floor: two desk clusters, a lounge corner, every door a few steps from spawn.
const g = rectRoom(30, 20, ".");
carve(g, 0, 9, 1, 2, "."); // west → HR
carve(g, 29, 6, 1, 2, "."); // east → meeting room
carve(g, 29, 13, 1, 2, "."); // east → pantry
carve(g, 14, 19, 2, 1, "."); // south → server room (Junior)

const deskRow = (y: number, xs: number[]) => xs.map((x) => ({ prefab: P.desk(), x, y }));

const spec: MapSpec = {
  key: "office-floor",
  grid: toRows(g),
  place: [
    ...deskRow(6, [3, 7, 19, 23]),
    ...deskRow(11, [3, 7, 19, 23]),
    { prefab: P.desk({ monitors: 0, laptop: true }), x: 12, y: 14 }, // the player's desk
    { prefab: P.whiteboard, x: 3, y: 2 },
    { prefab: P.sprintBoard, x: 7, y: 2 },
    { prefab: P.elevator, x: 24, y: 1 },
    { prefab: P.bookshelf, x: 11, y: 3 },
    { prefab: P.bookshelf, x: 12, y: 3 },
    { prefab: P.bookshelf, x: 13, y: 3 },
    { prefab: P.printer, x: 16, y: 3 },
    { prefab: P.waterCooler, x: 18, y: 3 },
    { prefab: P.plant, x: 1, y: 3 },
    { prefab: P.plant, x: 28, y: 3 },
    { prefab: P.plant, x: 1, y: 18 },
    { prefab: P.plant, x: 28, y: 18 },
    { prefab: P.plantSmall, x: 13, y: 18 },
    { prefab: P.plantSmall, x: 16, y: 18 },
    { prefab: P.rug(5, 3), x: 21, y: 15 },
    { prefab: P.sofa, x: 22, y: 15 },
    { prefab: P.sofa, x: 24, y: 15 },
    { prefab: P.doorMat, x: 1, y: 9 },
    { prefab: P.doorMat, x: 1, y: 10 },
    { prefab: P.doorMat, x: 28, y: 6 },
    { prefab: P.doorMat, x: 28, y: 7 },
    { prefab: P.doorMat, x: 28, y: 13 },
    { prefab: P.doorMat, x: 28, y: 14 },
    { prefab: P.lockSign, x: 14, y: 19 },
    { prefab: P.lockSign, x: 15, y: 19 },
  ],
  spawns: {
    default: [13, 17],
    "from-hr": [2, 9],
    "from-meeting": [27, 6],
    "from-pantry": [27, 13],
    "from-server": [14, 17],
    "from-elevator": [24, 4],
  },
  npcs: [
    { npcId: "tuan", x: 11, y: 9, facing: "down", behavior: "idle" },
    { npcId: "emma", x: 17, y: 11, facing: "left", behavior: "wander", wanderRadius: 2 },
    { npcId: "raj", x: 26, y: 10, facing: "left", behavior: "idle" },
  ],
  doors: [
    { x: 0, y: 9, w: 1, h: 2, targetMap: "hr-room", targetSpawn: "from-office" },
    { x: 29, y: 6, w: 1, h: 2, targetMap: "meeting-room", targetSpawn: "from-office" },
    { x: 29, y: 13, w: 1, h: 2, targetMap: "pantry", targetSpawn: "from-office" },
    {
      x: 14,
      y: 19,
      w: 2,
      h: 1,
      targetMap: "server-room",
      targetSpawn: "from-office",
      requires: "rank:junior",
    },
  ],
  interactables: [
    { x: 24, y: 2, w: 2, h: 1, objectId: "elevator", kind: "elevator", label: "Elevator" },
    {
      x: 3,
      y: 2,
      w: 2,
      h: 1,
      objectId: "wod-whiteboard",
      kind: "whiteboard",
      label: "Word of the Day",
    },
    {
      x: 7,
      y: 2,
      w: 2,
      h: 1,
      objectId: "sprint-board",
      kind: "sprintBoard",
      label: "Sprint Board",
    },
    { x: 12, y: 14, w: 3, h: 2, objectId: "my-desk", kind: "computer", label: "My computer" },
  ],
};

export default spec;
