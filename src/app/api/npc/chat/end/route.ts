import { z } from "zod";
import { withUser } from "@/lib/api/handler";
import { chatCall } from "@/lib/api/chatRoute";
import { endChat } from "@/features/npc-chat/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ sessionId: z.uuid() }) },
  async ({ userId, input }) =>
    chatCall(() => endChat(createAdminClient(), userId, input.sessionId)),
);
