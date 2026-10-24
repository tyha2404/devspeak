import type { CareerRank } from "../config/progression";

export interface NpcDef {
  id: string;
  name: string;
  role: { en: string; vi: string };
  /** Shown only once the learner reaches this level (and rank, if set). */
  unlockLevel: number;
  unlockRank?: CareerRank;
  voice: { lang: "en-US" | "en-GB" | "en-AU" | "en-IN"; pitch: number; rate: number };
  /** Character sheet row; defaults to the NPC id. */
  sprite?: string;
  /** Where the NPC is during certain hours (ICT); outside these windows they use their map placement. */
  schedule?: { map: string; from: string; to: string; tile: [number, number] }[];
}

export const NPCS: Record<string, NpcDef> = {
  linh: {
    id: "linh",
    name: "Linh",
    role: { en: "HR Manager", vi: "Quản lý nhân sự" },
    unlockLevel: 1,
    voice: { lang: "en-US", pitch: 1.1, rate: 0.9 },
  },
  tuan: {
    schedule: [{ map: "pantry", from: "11:30", to: "13:00", tile: [6, 10] }],
    id: "tuan",
    name: "Tuấn",
    role: { en: "Senior Developer", vi: "Lập trình viên senior" },
    unlockLevel: 1,
    voice: { lang: "en-US", pitch: 0.9, rate: 0.9 },
  },
  sarah: {
    id: "sarah",
    name: "Sarah Chen",
    role: { en: "Scrum Master", vi: "Scrum Master" },
    unlockLevel: 1,
    voice: { lang: "en-GB", pitch: 1.1, rate: 0.95 },
  },
  dave: {
    schedule: [{ map: "pantry", from: "11:30", to: "13:00", tile: [9, 10] }],
    id: "dave",
    name: "Dave Miller",
    role: { en: "Designer", vi: "Nhà thiết kế" },
    unlockLevel: 1,
    voice: { lang: "en-AU", pitch: 1, rate: 0.95 },
  },
  emma: {
    id: "emma",
    name: "Emma Wilson",
    role: { en: "QA Engineer", vi: "Kỹ sư kiểm thử" },
    unlockLevel: 3,
    voice: { lang: "en-GB", pitch: 1.05, rate: 0.9 },
  },
  raj: {
    id: "raj",
    name: "Raj Patel",
    role: { en: "Tech Lead", vi: "Trưởng nhóm kỹ thuật" },
    unlockLevel: 6,
    unlockRank: "junior",
    voice: { lang: "en-IN", pitch: 0.95, rate: 0.9 },
  },
  kenji: {
    id: "kenji",
    name: "Kenji Sato",
    role: { en: "SRE", vi: "Kỹ sư vận hành (SRE)" },
    unlockLevel: 6,
    unlockRank: "junior",
    voice: { lang: "en-US", pitch: 0.9, rate: 0.9 },
  },
  mike: {
    id: "mike",
    name: "Mike Johnson",
    role: { en: "Client Product Owner", vi: "Product Owner phía khách hàng" },
    unlockLevel: 13,
    unlockRank: "mid",
    voice: { lang: "en-US", pitch: 1, rate: 1 },
  },
  robert: {
    id: "robert",
    name: "Robert Hayes",
    role: { en: "CTO", vi: "Giám đốc công nghệ" },
    unlockLevel: 21,
    unlockRank: "senior",
    voice: { lang: "en-US", pitch: 0.85, rate: 0.9 },
  },
  mentee: {
    id: "mentee",
    name: "An",
    role: { en: "Intern (your mentee)", vi: "Thực tập sinh bạn kèm" },
    unlockLevel: 31,
    unlockRank: "techlead",
    voice: { lang: "en-US", pitch: 1.15, rate: 0.9 },
  },
  "attendee-a": {
    id: "attendee-a",
    name: "Priya",
    role: { en: "Conference attendee", vi: "Khách dự hội thảo" },
    unlockLevel: 21,
    unlockRank: "senior",
    voice: { lang: "en-IN", pitch: 1.05, rate: 0.95 },
  },
  "attendee-b": {
    id: "attendee-b",
    name: "Lucas",
    role: { en: "Conference speaker", vi: "Diễn giả hội thảo" },
    unlockLevel: 21,
    unlockRank: "senior",
    voice: { lang: "en-GB", pitch: 0.95, rate: 0.95 },
  },
};
