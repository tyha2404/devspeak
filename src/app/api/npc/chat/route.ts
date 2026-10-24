import { z } from "zod";
import { withUser } from "@/lib/api/handler";
import { chatCall } from "@/lib/api/chatRoute";
import { sendChat } from "@/features/npc-chat/service";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({ sessionId: z.uuid(), message: z.string().trim().min(1).max(280) });

export const maxDuration = 30;

export const POST = withUser(
  { input: Input, rateLimit: { bucket: "npc_chat", limit: 6, windowSec: 60 } },
  async ({ userId, isGuest, input }) =>
    chatCall(() => sendChat(createAdminClient(), userId, isGuest, input.sessionId, input.message)),
);
