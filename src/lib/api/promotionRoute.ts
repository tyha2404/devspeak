import "server-only";
import { PromotionError } from "@/features/promotion/service";
import { fail, ok } from "./handler";

export async function promotionCall<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof PromotionError)
      return fail(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 409);
    throw e;
  }
}
