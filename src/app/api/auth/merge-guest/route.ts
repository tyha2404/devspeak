import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { mergeGuest } from "@/features/account/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ guestAccessToken: z.string().min(20).max(4000) }), registered: true },
  async ({ userId, input }) =>
    ok(await mergeGuest(createAdminClient(), userId, input.guestAccessToken)),
);
