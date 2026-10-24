import "server-only";
import { DialogueError } from "@/features/dialogue/service";
import { QuizError } from "@/features/quiz/service";
import { fail } from "./handler";

const STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  ALREADY_ANSWERED: 409,
  ALREADY_DONE: 409,
  DELIVERY_EXPIRED: 410,
  TOO_MANY_OPEN: 429,
  EMPTY: 404,
  LOCKED: 403,
  BAD_CHOICE: 400,
  QUIZ_NOT_FINISHED: 409,
};

/** Map domain errors to API responses; rethrow anything unexpected. */
export function domainError(err: unknown) {
  if (err instanceof QuizError || err instanceof DialogueError) {
    return fail(err.code, err.message, STATUS[err.code] ?? 400);
  }
  throw err;
}
