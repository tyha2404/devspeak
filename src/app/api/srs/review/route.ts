import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { submitReview } from "@/features/srs/service";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  clientReviewId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  deliveryId: z.uuid().optional(),
  durationMs: z.number().int().min(0).max(600_000).optional(),
});

export const POST = withUser(
  { input: Input, rateLimit: { bucket: "srs_review", limit: 60, windowSec: 60 } },
  async ({ userId, input }) => {
    const db = createAdminClient();
    const r = await submitReview(db, userId, input);
    if (!r) return fail("NOT_FOUND", "Card not found", 404);
    return ok(r);
  },
);
