import { z } from "zod";

// Canonical (server-side) shapes stored in question_versions.prompt / .answer.
export interface Option {
  id: string;
  text: string;
}

export type StoredPrompt =
  | { type: "mcq_meaning"; skin: string; stem: string; question: string; options: Option[] }
  | { type: "fill_blank"; skin: string; context?: string; sentence: string; options?: Option[] }
  | { type: "sentence_order"; skin: string; instruction: string; tokens: Option[] }
  | { type: "error_correction"; skin: string; tokens: Option[]; options: Option[] }
  | {
      type: "reply_choice";
      skin: string;
      context: { speaker: string; text: string }[];
      options: Option[];
    }
  | {
      type: "listening";
      skin: string;
      tts: string;
      voice: string;
      question: string;
      options: Option[];
      /**
       * Dictation: the learner types what they hear. With browser TTS the text has to reach the
       * client to be spoken, so dictation is low-stakes practice (it can't be fully cheat-proof
       * until audio is generated server-side).
       */
      dictation?: boolean;
      /** Dictation with pre-generated speech: the client gets only this URL, never the text. */
      audio?: string;
      /** Meeting minutes: multi-speaker audio script. */
      script?: { speaker: string; voice: string; text: string }[];
    };

export type StoredAnswer =
  | { kind: "choice"; correct: string }
  | { kind: "text"; accepted: string[] }
  | { kind: "order"; text: string }
  | { kind: "fix"; wrong: string; correct: string };

/** What the learner submits; ids are the opaque per-delivery ids. */
export const QuizResponse = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), optionId: z.string().max(16) }),
  z.object({ kind: z.literal("text"), text: z.string().trim().min(1).max(80) }),
  z.object({ kind: z.literal("order"), tokenIds: z.array(z.string().max(16)).min(1).max(20) }),
  z.object({ kind: z.literal("fix"), tokenId: z.string().max(16), optionId: z.string().max(16) }),
]);
export type QuizResponse = z.infer<typeof QuizResponse>;
