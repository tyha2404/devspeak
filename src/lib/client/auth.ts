import { api } from "@/lib/client/api";
import { createClient } from "@/lib/supabase/browser";

// Signing in or signing up from a guest session switches to another user. To keep the guest's
// progress, its access token is parked in sessionStorage first and merged into the account once
// a registered session exists (right away for passwords, after the redirect for links and OAuth).

const KEY = "dq:merge-guest";
let merging: Promise<boolean> | null = null;

/** If the current session is a guest, remember it so its progress can be merged after sign-in. */
export async function rememberGuest() {
  const { data } = await createClient().auth.getSession();
  if (!data.session?.user.is_anonymous) return;
  try {
    sessionStorage.setItem(KEY, data.session.access_token);
  } catch {
    // private mode: the guest's progress just isn't carried over
  }
}

/** Merge a remembered guest into the signed-in account. Returns true when something was merged. */
export async function mergeRememberedGuest() {
  if (merging) return merging;
  merging = mergeGuest().finally(() => {
    merging = null;
  });
  return merging;
}

async function mergeGuest() {
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
  if (!token) return false;
  const { data } = await createClient().auth.getUser();
  if (!data.user || data.user.is_anonymous) return false;
  try {
    const result = await api.post<{ merged: boolean }>("/api/auth/merge-guest", {
      guestAccessToken: token,
    });
    try {
      if (sessionStorage.getItem(KEY) === token) sessionStorage.removeItem(KEY);
    } catch {}
    return result.merged;
  } catch {
    return false; // Keep the token so a temporary network/server failure can be retried.
  }
}

/** Sign out and start over as a fresh guest (a full reload clears every client store). */
export async function signOut() {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  location.href = "/";
}
