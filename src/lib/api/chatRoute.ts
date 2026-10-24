import "server-only";
import { ChatError } from "@/features/npc-chat/service";
import { fail, ok } from "./handler";

const STATUS = {
  QUOTA_EXCEEDED: 429,
  AI_UNAVAILABLE: 503,
  NOT_FOUND: 404,
  LOCKED: 403,
  ALREADY_DONE: 409,
};

export async function chatCall<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof ChatError) return fail(e.code, e.message, STATUS[e.code]);
    throw e;
  }
}
