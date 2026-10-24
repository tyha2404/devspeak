import hrRoom from "./hr-room";
import meetingRoom from "./meeting-room";
import officeFloor from "./office-floor";
import pantry from "./pantry";
import serverRoom from "./server-room";
import clientOffice from "./client-office";
import conferenceHall from "./conference-hall";
import rooftop from "./rooftop";
import type { MapSpec } from "./types";

export const MAP_SPECS: MapSpec[] = [
  officeFloor,
  meetingRoom,
  pantry,
  hrRoom,
  serverRoom,
  clientOffice,
  conferenceHall,
  rooftop,
];
