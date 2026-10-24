import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { submitAnswer } from "@/features/quiz/service";
import { QuizResponse } from "@/features/quiz/types";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({ deliveryId: z.uuid(), response: QuizResponse });

export const POST = withUser(
  {
    input: Input,
    rateLimit: [
      { bucket: "answer", limit: 30, windowSec: 60 },
      { bucket: "answer_day", limit: 1500, windowSec: 86400 },
    ],
  },
  async ({ userId, input }) => {
    try {
      const db = createAdminClient();
      return ok(await submitAnswer(db, userId, input.deliveryId, input.response));
    } catch (err) {
      return domainError(err);
    }
  },
);
