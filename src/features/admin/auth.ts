import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Server-side gate for every admin page and action (middleware is only a first filter). */
export async function requireEditor(role: "editor" | "admin" = "editor") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || data?.claims?.is_anonymous) redirect("/login?next=/admin");
  const { data: allowed } = await supabase.rpc("has_role", { r: role });
  if (!allowed) redirect("/?error=forbidden");
  return { userId, supabase };
}
