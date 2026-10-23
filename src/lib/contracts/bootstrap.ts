import { z } from "zod";
import { PositionSchema } from "./position";

export const BootstrapSchema = z.object({
  profile: z.object({
    displayName: z.string().nullable(),
    level: z.number().int(),
    xpTotal: z.number().int(),
    coins: z.number().int(),
    rank: z.enum(["intern", "junior", "mid", "senior", "techlead"]),
    streak: z.number().int(),
    isGuest: z.boolean(),
  }),
  position: PositionSchema.extend({ updatedAt: z.number() }).nullable(),
  unlocks: z.array(z.string()),
});

export type Bootstrap = z.infer<typeof BootstrapSchema>;
