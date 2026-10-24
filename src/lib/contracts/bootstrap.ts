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
    ptoDays: z.number().int(),
    isGuest: z.boolean(),
    placementDone: z.boolean(),
    avatar: z.string(),
  }),
  position: PositionSchema.extend({ updatedAt: z.number() }).nullable(),
  unlocks: z.array(z.string()),
  /** NPCs with a conversation the learner hasn't finished: they show a "!" marker. */
  npcsWithNew: z.array(z.string()),
  deskItems: z.array(z.string()),
  srsDue: z.number().int(),
});

export type Bootstrap = z.infer<typeof BootstrapSchema>;
