import type { MapKey } from "../events";

export interface MapDef {
  key: MapKey;
  displayName: { en: string; vi: string };
  /** Maps that exist as built assets. Others are referenced by locked doors only. */
  built: boolean;
  /** Unlock id needed to enter (checked by the elevator UI and the server when saving position). */
  requires?: string;
  /** Floors reachable by elevator, in button order. */
  elevator?: boolean;
  neighbors: MapKey[];
}

export const MAPS: Record<MapKey, MapDef> = {
  "office-floor": {
    key: "office-floor",
    elevator: true,
    displayName: { en: "Office", vi: "Văn phòng" },
    built: true,
    neighbors: ["meeting-room", "pantry", "hr-room"],
  },
  "meeting-room": {
    key: "meeting-room",
    displayName: { en: "Meeting room", vi: "Phòng họp" },
    built: true,
    neighbors: ["office-floor"],
  },
  pantry: {
    key: "pantry",
    displayName: { en: "Pantry", vi: "Pantry" },
    built: true,
    neighbors: ["office-floor"],
  },
  "hr-room": {
    key: "hr-room",
    displayName: { en: "HR room", vi: "Phòng nhân sự" },
    built: true,
    neighbors: ["office-floor"],
  },
  "server-room": {
    key: "server-room",
    requires: "rank:junior",
    displayName: { en: "Server room", vi: "Phòng server" },
    built: true,
    neighbors: ["office-floor"],
  },
  "client-office": {
    key: "client-office",
    requires: "rank:mid",
    elevator: true,
    displayName: { en: "Client office", vi: "Văn phòng khách hàng" },
    built: true,
    neighbors: [],
  },
  "conference-hall": {
    key: "conference-hall",
    requires: "rank:senior",
    elevator: true,
    displayName: { en: "Conference hall", vi: "Hội trường" },
    built: true,
    neighbors: [],
  },
  rooftop: {
    key: "rooftop",
    requires: "rank:techlead",
    elevator: true,
    displayName: { en: "Rooftop", vi: "Sân thượng" },
    built: true,
    neighbors: [],
  },
};

export const BUILT_MAPS = Object.values(MAPS)
  .filter((m) => m.built)
  .map((m) => m.key);

export const mapUrl = (key: MapKey) => `/assets/maps/${key}.json`;
