import { carve, rectRoom, toRows } from "./grid";
import * as P from "./prefabs";
import type { MapSpec } from "./types";

const g = rectRoom(40, 26, ".");
carve(g, 0, 12, 1, 2, "."); // west → HR
carve(g, 39, 7, 1, 2, "."); // east → meeting room
carve(g, 39, 17, 1, 2, "."); // east → pantry
carve(g, 19, 25, 2, 1, "."); // south → server room (Junior)

const deskRow = (y: number, xs: number[]) => xs.map((x) => ({ prefab: P.desk(), x, y }));

const spec: MapSpec = {
  key: "office-floor",
  grid: toRows(g),
  place: [
    ...deskRow(6, [6, 10, 24, 28]),
    ...deskRow(11, [6, 10, 24, 28]),
    ...deskRow(17, [6, 10, 24, 28]),
    { prefab: P.desk({ monitors: 0, laptop: true }), x: 16, y: 17 }, // the player's desk
    { prefab: P.whiteboard, x: 3, y: 2 },
    { prefab: P.sprintBoard, x: 8, y: 2 },
    { prefab: P.elevator, x: 34, y: 1 },
    { prefab: P.bookshelf, x: 14, y: 3 },
    { prefab: P.bookshelf, x: 15, y: 3 },
    { prefab: P.bookshelf, x: 16, y: 3 },
    { prefab: P.printer, x: 20, y: 3 },
    { prefab: P.waterCooler, x: 22, y: 3 },
    { prefab: P.plant, x: 1, y: 3 },
    { prefab: P.plant, x: 38, y: 3 },
    { prefab: P.plant, x: 1, y: 24 },
    { prefab: P.plant, x: 38, y: 24 },
    { prefab: P.plantSmall, x: 18, y: 24 },
    { prefab: P.plantSmall, x: 21, y: 24 },
    { prefab: P.rug(6, 4), x: 32, y: 20 },
    { prefab: P.sofa, x: 33, y: 20 },
    { prefab: P.sofa, x: 35, y: 20 },
    { prefab: P.doorMat, x: 1, y: 12 },
    { prefab: P.doorMat, x: 1, y: 13 },
    { prefab: P.doorMat, x: 38, y: 7 },
    { prefab: P.doorMat, x: 38, y: 8 },
    { prefab: P.doorMat, x: 38, y: 17 },
    { prefab: P.doorMat, x: 38, y: 18 },
    { prefab: P.lockSign, x: 19, y: 25 },
    { prefab: P.lockSign, x: 20, y: 25 },
  ],
  spawns: {
    default: [17, 21],
    "from-hr": [2, 12],
    "from-meeting": [37, 7],
    "from-pantry": [37, 17],
    "from-server": [19, 23],
    "from-elevator": [34, 4],
  },
  npcs: [
    { npcId: "tuan", x: 13, y: 9, facing: "down", behavior: "idle" },
    { npcId: "emma", x: 27, y: 15, facing: "left", behavior: "wander", wanderRadius: 2 },
    { npcId: "raj", x: 34, y: 14, facing: "left", behavior: "idle" },
  ],
  doors: [
    { x: 0, y: 12, w: 1, h: 2, targetMap: "hr-room", targetSpawn: "from-office" },
    { x: 39, y: 7, w: 1, h: 2, targetMap: "meeting-room", targetSpawn: "from-office" },
    { x: 39, y: 17, w: 1, h: 2, targetMap: "pantry", targetSpawn: "from-office" },
    {
      x: 19,
      y: 25,
      w: 2,
      h: 1,
      targetMap: "server-room",
      targetSpawn: "from-office",
      requires: "rank:junior",
    },
  ],
  interactables: [
    { x: 34, y: 2, w: 2, h: 1, objectId: "elevator", kind: "elevator", label: "Elevator" },
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
      x: 8,
      y: 2,
      w: 2,
      h: 1,
      objectId: "sprint-board",
      kind: "sprintBoard",
      label: "Sprint Board",
    },
    { x: 16, y: 17, w: 3, h: 2, objectId: "my-desk", kind: "computer", label: "My computer" },
  ],
};

export default spec;
