import { NextResponse } from "next/server";
import { withUser } from "@/lib/api/handler";
import { exportAccount } from "@/features/account/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser(
  { rateLimit: { bucket: "export", limit: 5, windowSec: 3600 } },
  async ({ userId }) =>
    NextResponse.json(await exportAccount(createAdminClient(), userId), {
      headers: {
        "Content-Disposition": `attachment; filename="devspeak-export.json"`,
        "Cache-Control": "no-store",
      },
    }),
);
