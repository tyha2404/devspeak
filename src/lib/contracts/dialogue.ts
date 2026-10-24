// Client-facing dialogue shapes: what the server sends after stripping grading data.

export type ClientNode =
  | { id: string; type: "line"; speaker: "npc" | "player"; en: string; vi?: string }
  | {
      id: string;
      type: "choice";
      promptEn?: string;
      promptVi?: string;
      choices: { id: string; en: string; vi?: string }[];
    }
  | {
      id: string;
      type: "quiz";
      introEn?: string;
      introVi?: string;
      sessionId: string;
      total: number;
      passAt: number;
    }
  | {
      id: string;
      type: "freewrite";
      taskEn: string;
      taskVi: string;
      context: { speaker: string; text: string }[];
    }
  | { id: string; type: "speak"; promptEn: string; promptVi: string; phrases: string[] }
  | { id: string; type: "end" };

export interface GlossEntry {
  slug: string;
  lemma: string;
  pos: string;
  ipa: string | null;
  vi: string;
  def: string;
  note: string | null;
  example: { en: string; vi: string | null } | null;
}

export interface DialogueStep {
  runId: string;
  title: { en: string; vi: string };
  node: ClientNode;
  glossary: Record<string, GlossEntry>;
  feedback?: {
    quality: "best" | "ok" | "poor";
    en?: string;
    vi: string;
    fixes?: { original: string; corrected: string }[];
    better?: string;
  };
  done: boolean;
  rewards?: {
    xp: number;
    leveledUp: boolean;
    level: number;
    xpTotal: number;
    coins: number;
    wordsLearned: string[];
  };
}
