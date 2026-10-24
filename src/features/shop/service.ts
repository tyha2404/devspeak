import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COSMETIC } from "@/game/config/cosmetics";

export class ShopError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "NOT_ENOUGH_COINS" | "ALREADY_OWNED" | "PTO_FULL",
    message: string,
  ) {
    super(message);
  }
}

export async function buy(db: SupabaseClient, userId: string, itemId: string) {
  const item = COSMETIC[itemId];
  if (!item) throw new ShopError("NOT_FOUND", "Unknown item");
  if (item.kind === "pto") {
    const { data: p } = await db
      .from("profiles")
      .select("streak_freezes")
      .eq("id", userId)
      .single();
    if ((p?.streak_freezes ?? 0) >= 2)
      throw new ShopError("PTO_FULL", "You can hold at most 2 PTO days");
  } else {
    const { data: owned } = await db
      .from("user_cosmetics")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();
    if (owned) throw new ShopError("ALREADY_OWNED", "Already owned");
  }
  const { data: coins, error } = await db.rpc("svc_spend_coins", {
    p_user: userId,
    p_amount: Math.max(1, item.price),
    p_reason: `shop:${itemId}`,
    p_key: `shop:${itemId}:${item.kind === "pto" ? crypto.randomUUID() : "once"}`,
  });
  if (error) {
    if (error.hint === "NOT_ENOUGH_COINS")
      throw new ShopError("NOT_ENOUGH_COINS", "Not enough Coffee Beans");
    throw error;
  }
  if (item.kind === "pto") {
    const { data: p } = await db
      .from("profiles")
      .select("streak_freezes")
      .eq("id", userId)
      .single();
    await db
      .from("profiles")
      .update({ streak_freezes: Math.min(2, (p?.streak_freezes ?? 0) + 1) })
      .eq("id", userId);
  } else {
    await db.from("user_cosmetics").insert({ user_id: userId, item_id: itemId });
  }
  return { coins: coins as number };
}

/** Equip a hoodie (one at a time) or toggle a desk item. */
export async function equip(db: SupabaseClient, userId: string, itemId: string, on: boolean) {
  const item = COSMETIC[itemId];
  if (!item || item.kind === "pto") throw new ShopError("NOT_FOUND", "Unknown item");
  if (item.price > 0) {
    const { data: owned } = await db
      .from("user_cosmetics")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();
    if (!owned) throw new ShopError("NOT_FOUND", "Not owned");
  }
  if (item.kind === "hoodie") {
    const hoodies = Object.values(COSMETIC)
      .filter((c) => c.kind === "hoodie")
      .map((c) => c.id);
    await db
      .from("user_cosmetics")
      .update({ equipped: false })
      .eq("user_id", userId)
      .in("item_id", hoodies);
    if (item.price === 0) {
      await db.from("profiles").update({ avatar_key: "player" }).eq("id", userId);
      return { avatar: "player" };
    }
  }
  await db
    .from("user_cosmetics")
    .update({ equipped: on })
    .eq("user_id", userId)
    .eq("item_id", itemId);
  if (item.kind === "hoodie")
    await db.from("profiles").update({ avatar_key: item.sprite! }).eq("id", userId);
  return { avatar: item.kind === "hoodie" ? item.sprite! : undefined };
}

export async function inventory(db: SupabaseClient, userId: string) {
  const [{ data: items }, { data: p }] = await Promise.all([
    db.from("user_cosmetics").select("item_id, equipped").eq("user_id", userId),
    db.from("profiles").select("coins, streak_freezes, avatar_key").eq("id", userId).single(),
  ]);
  return {
    items: items ?? [],
    coins: p?.coins ?? 0,
    ptoDays: p?.streak_freezes ?? 0,
    avatar: p?.avatar_key ?? "player",
  };
}
