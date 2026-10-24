// The colleagues who guide each unit (formerly the game's NPCs): names, roles and TTS voices.

export interface Character {
  id: string;
  name: string;
  role: { en: string; vi: string };
  voice: { lang: "en-US" | "en-GB" | "en-AU" | "en-IN"; pitch: number; rate: number };
}

export const CHARACTERS: Record<string, Character> = {
  linh: {
    id: "linh",
    name: "Linh",
    role: { en: "HR Manager", vi: "Quản lý nhân sự" },
    voice: { lang: "en-US", pitch: 1.1, rate: 0.9 },
  },
  tuan: {
    id: "tuan",
    name: "Tuấn",
    role: { en: "Senior Developer", vi: "Lập trình viên senior" },
    voice: { lang: "en-US", pitch: 0.9, rate: 0.9 },
  },
  sarah: {
    id: "sarah",
    name: "Sarah Chen",
    role: { en: "Scrum Master", vi: "Scrum Master" },
    voice: { lang: "en-GB", pitch: 1.1, rate: 0.95 },
  },
  dave: {
    id: "dave",
    name: "Dave Miller",
    role: { en: "Designer", vi: "Nhà thiết kế" },
    voice: { lang: "en-AU", pitch: 1, rate: 0.95 },
  },
  emma: {
    id: "emma",
    name: "Emma Wilson",
    role: { en: "QA Engineer", vi: "Kỹ sư kiểm thử" },
    voice: { lang: "en-GB", pitch: 1.05, rate: 0.9 },
  },
  raj: {
    id: "raj",
    name: "Raj Patel",
    role: { en: "Tech Lead", vi: "Trưởng nhóm kỹ thuật" },
    voice: { lang: "en-IN", pitch: 0.95, rate: 0.9 },
  },
  kenji: {
    id: "kenji",
    name: "Kenji Sato",
    role: { en: "SRE", vi: "Kỹ sư vận hành (SRE)" },
    voice: { lang: "en-US", pitch: 0.9, rate: 0.9 },
  },
  mike: {
    id: "mike",
    name: "Mike Johnson",
    role: { en: "Client Product Owner", vi: "Product Owner phía khách hàng" },
    voice: { lang: "en-US", pitch: 1, rate: 1 },
  },
  robert: {
    id: "robert",
    name: "Robert Hayes",
    role: { en: "CTO", vi: "Giám đốc công nghệ" },
    voice: { lang: "en-US", pitch: 0.85, rate: 0.9 },
  },
  mentee: {
    id: "mentee",
    name: "An",
    role: { en: "Intern (your mentee)", vi: "Thực tập sinh bạn kèm" },
    voice: { lang: "en-US", pitch: 1.15, rate: 0.9 },
  },
  "attendee-a": {
    id: "attendee-a",
    name: "Priya",
    role: { en: "Conference attendee", vi: "Khách dự hội thảo" },
    voice: { lang: "en-IN", pitch: 1.05, rate: 0.95 },
  },
  "attendee-b": {
    id: "attendee-b",
    name: "Lucas",
    role: { en: "Conference speaker", vi: "Diễn giả hội thảo" },
    voice: { lang: "en-GB", pitch: 0.95, rate: 0.95 },
  },
};

export const character = (id: string): Character =>
  CHARACTERS[id] ?? {
    id,
    name: id,
    role: { en: "", vi: "" },
    voice: { lang: "en-US", pitch: 1, rate: 0.95 },
  };
