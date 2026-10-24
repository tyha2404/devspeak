import { z } from "zod";
import { withUser } from "@/lib/api/handler";
import { chatCall } from "@/lib/api/chatRoute";
import { startChat } from "@/features/npc-chat/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  {
    input: z.object({ npcId: z.string().max(32) }),
    rateLimit: { bucket: "chat_start", limit: 10, windowSec: 3600 },
  },
  async ({ userId, input }) => chatCall(() => startChat(createAdminClient(), userId, input.npcId)),
);
