import { z } from "zod";

// Public vars are inlined by Next at build time, so they must be referenced explicitly.
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_GEN: z.string().default("claude-sonnet-5-5"),
  ANTHROPIC_MODEL_QA: z.string().default("claude-haiku-5-5"),
  CRON_SECRET: z.string().min(16).optional(),
  AI_DAILY_BUDGET_USD: z.coerce.number().positive().default(15),
  APP_TIMEZONE: z.string().default("Asia/Ho_Chi_Minh"),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});

let cachedServerEnv: z.infer<typeof serverSchema> | undefined;

/** Server-only env. Parsed lazily so client bundles never evaluate it. */
export function serverEnv() {
  if (typeof window !== "undefined") throw new Error("serverEnv() called in the browser");
  cachedServerEnv ??= serverSchema.parse(process.env);
  return cachedServerEnv;
}
