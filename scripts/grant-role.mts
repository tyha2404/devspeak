/**
 * Grant an editor/admin role: pnpm grant-role <email> <editor|admin>
 */
import { createClient } from "@supabase/supabase-js";

const [email, role] = process.argv.slice(2);
if (!email || !["editor", "admin"].includes(role ?? ""))
  throw new Error("usage: grant-role <email> <editor|admin>");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});
const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = data.users.find((u) => u.email === email);
if (!user) throw new Error(`no user with email ${email} (sign in once first)`);
const { error: e2 } = await db
  .from("user_roles")
  .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
if (e2) throw e2;
console.log(`granted ${role} to ${email}`);
