import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { buy, ShopError } from "@/features/shop/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  {
    input: z.object({ itemId: z.string().max(32) }),
    rateLimit: { bucket: "shop", limit: 20, windowSec: 60 },
  },
  async ({ userId, input }) => {
    try {
      return ok(await buy(createAdminClient(), userId, input.itemId));
    } catch (e) {
      if (e instanceof ShopError)
        return fail(
          e.code === "NOT_FOUND" ? "NOT_FOUND" : "LOCKED",
          e.message,
          e.code === "NOT_FOUND" ? 404 : 409,
        );
      throw e;
    }
  },
);
