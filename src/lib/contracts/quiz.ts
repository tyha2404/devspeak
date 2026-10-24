import type { ClientPrompt } from "@/features/quiz/deliver";
import type { QuizResponse } from "@/features/quiz/types";

export type { ClientPrompt, QuizResponse };

export interface DeliveryView {
  deliveryId: string;
  index: number;
  total: number;
  type: ClientPrompt["type"];
  prompt: ClientPrompt;
  hasHint: boolean;
  expiresAt: string;
  deadline: string | null;
  timeLimitSec: number | null;
}

export interface SessionDone {
  done: true;
  answered: number;
  correct: number;
  total: number;
}

export type RevealedAnswer =
  | { kind: "choice"; optionId?: string }
  | { kind: "text"; text?: string }
  | { kind: "order"; text: string }
  | { kind: "fix"; tokenId?: string; optionId?: string };

export type AnswerResult =
  | { final: false; correct: false; attempt: number; hint: string }
  | {
      final: true;
      correct: boolean;
      attempt: number;
      xp: number;
      answer: RevealedAnswer;
      explanation: { vi: string | null; en: string | null };
      totals: {
        xpTotal: number;
        streak: number;
        todayXp: number;
        dailyGoal: number;
        goalMetNow: boolean;
      } | null;
      session: { answered: number; correct: number; total: number; done: boolean } | null;
    };
