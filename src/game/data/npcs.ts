import type { CareerRank } from "../config/progression";

export interface NpcDef {
  id: string;
  name: string;
  role: { en: string; vi: string };
  /** Shown only once the learner reaches this level (and rank, if set). */
  unlockLevel: number;
  unlockRank?: CareerRank;
  voice: { lang: "en-US" | "en-GB" | "en-AU" | "en-IN"; pitch: number; rate: number };
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
    unlockLevel: 1,
    voice: { lang: "en-US", pitch: 0.85, rate: 0.9 },
  },
};
