import { ok, withUser } from "@/lib/api/handler";
import { inventory } from "@/features/shop/service";
import { COSMETICS } from "@/game/config/cosmetics";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async ({ userId }) =>
  ok({ catalogue: COSMETICS, ...(await inventory(createAdminClient(), userId)) }),
);
