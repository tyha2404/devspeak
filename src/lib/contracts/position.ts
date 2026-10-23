import { z } from "zod";

export const MAP_KEYS = [
  "office-floor",
  "meeting-room",
  "pantry",
  "hr-room",
  "server-room",
  "client-office",
  "conference-hall",
  "rooftop",
] as const;

export const FacingSchema = z.enum(["up", "down", "left", "right"]);

export const PositionSchema = z.object({
  mapKey: z.enum(MAP_KEYS),
  x: z.number().int().min(0).max(4096),
  y: z.number().int().min(0).max(4096),
  facing: FacingSchema,
});

export type Position = z.infer<typeof PositionSchema>;
