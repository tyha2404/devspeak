import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, post } = vi.hoisted(() => ({
  auth: { getSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn() },
  post: vi.fn(),
}));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth }) }));
vi.mock("@/lib/client/api", () => ({ api: { post } }));

import { mergeRememberedGuest, rememberGuest, signOut } from "./auth";

const key = "dq:merge-guest";
let storage: Map<string, string>;

beforeEach(() => {
  vi.resetAllMocks();
  storage = new Map();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("location", { href: "/profile" });
  auth.getUser.mockResolvedValue({ data: { user: { is_anonymous: false } } });
});

describe("guest progress after authentication", () => {
  it("remembers only anonymous sessions", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user: { is_anonymous: true }, access_token: "guest" } },
    });
    await rememberGuest();
    expect(storage.get(key)).toBe("guest");
    auth.getSession.mockResolvedValue({
      data: { session: { user: { is_anonymous: false }, access_token: "registered" } },
    });
    await rememberGuest();
    expect(storage.get(key)).toBe("guest");
  });

  it("retains progress on transient failure and retries successfully", async () => {
    storage.set(key, "guest");
    post.mockRejectedValueOnce(new Error("offline"));
    expect(await mergeRememberedGuest()).toBe(false);
    expect(storage.get(key)).toBe("guest");
    post.mockResolvedValueOnce({ merged: true });
    expect(await mergeRememberedGuest()).toBe(true);
    expect(storage.has(key)).toBe(false);
  });

  it("shares a single merge between concurrent callers", async () => {
    storage.set(key, "guest");
    post.mockResolvedValue({ merged: true });
    expect(await Promise.all([mergeRememberedGuest(), mergeRememberedGuest()])).toEqual([
      true,
      true,
    ]);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("waits for a registered session and discards invalid guest tokens after a response", async () => {
    storage.set(key, "guest");
    auth.getUser.mockResolvedValueOnce({ data: { user: { is_anonymous: true } } });
    expect(await mergeRememberedGuest()).toBe(false);
    expect(post).not.toHaveBeenCalled();
    expect(storage.has(key)).toBe(true);
    post.mockResolvedValue({ merged: false });
    expect(await mergeRememberedGuest()).toBe(false);
    expect(storage.has(key)).toBe(false);
  });

  it("clears the remembered guest only after successful sign-out", async () => {
    storage.set(key, "guest");
    auth.signOut.mockResolvedValueOnce({ error: new Error("offline") });
    await expect(signOut()).rejects.toThrow("offline");
    expect(storage.has(key)).toBe(true);
    expect(location.href).toBe("/profile");
    auth.signOut.mockResolvedValueOnce({ error: null });
    await signOut();
    expect(storage.has(key)).toBe(false);
    expect(location.href).toBe("/");
  });
});
