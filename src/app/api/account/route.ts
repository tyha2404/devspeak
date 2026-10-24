import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { deleteAccount } from "@/features/account/service";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({ confirm: z.literal("XOA TAI KHOAN") });

export const DELETE = withUser({ input: Input }, async ({ userId, supabase }) => {
  await deleteAccount(createAdminClient(), userId);
  await supabase.auth.signOut();
  return ok({ deleted: true });
});
