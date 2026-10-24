import { beforeEach, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({
  auth: { getSession: vi.fn(), signInAnonymously: vi.fn() },
}));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth }) }));
vi.mock("@/env", () => ({ publicEnv: { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "" } }));
import { ensureSession } from "./session";

beforeEach(() => vi.resetAllMocks());

it("creates just one guest when multiple components load concurrently", async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } });
  const session = { access_token: "guest" };
  auth.signInAnonymously.mockResolvedValue({ data: { session }, error: null });
  expect(await Promise.all([ensureSession(), ensureSession()])).toEqual([session, session]);
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
});

it("allows retry after anonymous sign-in fails", async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.signInAnonymously.mockResolvedValueOnce({ data: {}, error: new Error("offline") });
  await expect(ensureSession()).rejects.toThrow("offline");
  auth.signInAnonymously.mockResolvedValueOnce({
    data: { session: { access_token: "guest" } },
    error: null,
  });
  expect(await ensureSession()).toEqual({ access_token: "guest" });
});
