import { NextResponse } from "next/server";
import { z } from "zod";
import { glossary } from "@/features/dialogue/service";
import { createClient } from "@/lib/supabase/server";

const Slugs = z
  .array(z.string().regex(/^[a-z0-9-]+$/))
  .min(1)
  .max(50);

/** Published vocabulary is public reference data (RLS: published senses only). */
export async function GET(req: Request) {
  const parsed = Slugs.safeParse(new URL(req.url).searchParams.get("slugs")?.split(",") ?? []);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "slugs" } },
      { status: 400 },
    );
  const data = await glossary(await createClient(), parsed.data);
  return NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
