import type { ClientPrompt, QuizResponse, RevealedAnswer } from "@/lib/contracts/quiz";

export interface MiniGameProps<T extends ClientPrompt["type"] = ClientPrompt["type"]> {
  prompt: Extract<ClientPrompt, { type: T }>;
  /** Locked while submitting or after the final attempt. */
  disabled: boolean;
  /** Set after the final attempt: highlight the right answer. */
  reveal: RevealedAnswer | null;
  /** The learner's last (wrong) attempt, to show what they picked. */
  lastWrong: QuizResponse | null;
  onSubmit: (r: QuizResponse) => void;
}
