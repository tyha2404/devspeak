import hrRoom from "./hr-room";
import meetingRoom from "./meeting-room";
import officeFloor from "./office-floor";
import pantry from "./pantry";
import type { MapSpec } from "./types";

export const MAP_SPECS: MapSpec[] = [officeFloor, meetingRoom, pantry, hrRoom];
