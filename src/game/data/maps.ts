import type { MapKey } from "../events";

export interface MapDef {
  key: MapKey;
  displayName: { en: string; vi: string };
  /** Maps that exist as built assets. Others are referenced by locked doors only. */
  built: boolean;
  neighbors: MapKey[];
}

export const MAPS: Record<MapKey, MapDef> = {
  "office-floor": {
    key: "office-floor",
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
    displayName: { en: "Server room", vi: "Phòng server" },
    built: false,
    neighbors: [],
  },
  "client-office": {
    key: "client-office",
    displayName: { en: "Client office", vi: "Văn phòng khách hàng" },
    built: false,
    neighbors: [],
  },
  "conference-hall": {
    key: "conference-hall",
    displayName: { en: "Conference hall", vi: "Hội trường" },
    built: false,
    neighbors: [],
  },
  rooftop: {
    key: "rooftop",
    displayName: { en: "Rooftop", vi: "Sân thượng" },
    built: false,
    neighbors: [],
  },
};

export const BUILT_MAPS = Object.values(MAPS)
  .filter((m) => m.built)
  .map((m) => m.key);

export const mapUrl = (key: MapKey) => `/assets/maps/${key}.json`;
