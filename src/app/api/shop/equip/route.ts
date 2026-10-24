import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { equip, ShopError } from "@/features/shop/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ itemId: z.string().max(32), on: z.boolean().default(true) }) },
  async ({ userId, input }) => {
    try {
      return ok(await equip(createAdminClient(), userId, input.itemId, input.on));
    } catch (e) {
      if (e instanceof ShopError) return fail("NOT_FOUND", e.message, 404);
      throw e;
    }
  },
);
