"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cosmetic } from "@/game/config/cosmetics";
import { EventBus } from "@/game/EventBus";
import { api, ApiError } from "@/lib/client/api";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { Panel } from "./Panel";

interface Shop {
  catalogue: Cosmetic[];
  items: { item_id: string; equipped: boolean }[];
  coins: number;
  ptoDays: number;
  avatar: string;
}

export function ShopPanel({ onClose }: { onClose: () => void }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const toast = useUiStore((s) => s.toast);
  const load = useCallback(() => api.get<Shop>("/api/shop").then(setShop), []);
  useEffect(() => {
    void load();
  }, [load]);

  const syncGame = (s: Shop) => {
    const desk = s.catalogue
      .filter((c) => c.kind === "desk" && s.items.some((i) => i.item_id === c.id && i.equipped))
      .map((c) => c.sprite!);
    EventBus.emit("player:cosmetics-changed", { avatar: s.avatar, deskItems: desk });
    const { profile, setProfile } = useProfileStore.getState();
    if (profile) setProfile({ ...profile, coins: s.coins, ptoDays: s.ptoDays, avatar: s.avatar });
  };

  const act = async (url: string, body: object, done: string) => {
    try {
      await api.post(url, body);
      toast(done);
      const s = await api.get<Shop>("/api/shop");
      setShop(s);
      syncGame(s);
    } catch (e) {
      toast(
        e instanceof ApiError
          ? e.message.includes("Coffee")
            ? "☕ Chưa đủ Coffee Beans"
            : e.message
          : "Có lỗi",
      );
    }
  };

  return (
    <Panel title={`☕ Coffee Beans shop · ${shop?.coins ?? 0} beans`} onClose={onClose}>
      <p className="mb-3 text-sm text-[#5c5c7a]">
        Chỉ bán đồ trang trí và ngày nghỉ phép giữ streak — không bán XP hay gợi ý.
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shop?.catalogue.map((c) => {
          const owned = c.price === 0 || shop.items.some((i) => i.item_id === c.id);
          const equipped =
            c.kind === "hoodie"
              ? shop.avatar === c.sprite
              : shop.items.some((i) => i.item_id === c.id && i.equipped);
          return (
            <li key={c.id} className="flex items-center justify-between rounded bg-white p-3">
              <span>
                <b>{c.name.vi}</b>
                <span className="block text-xs text-[#5c5c7a]">
                  {c.kind === "pto"
                    ? `Đang có ${shop.ptoDays}/2`
                    : c.price
                      ? `☕ ${c.price}`
                      : "Miễn phí"}
                </span>
              </span>
              {c.kind === "pto" || !owned ? (
                <button
                  onClick={() => act("/api/shop/buy", { itemId: c.id }, `Đã mua ${c.name.vi}`)}
                  className="rounded bg-[#f2a65a] px-3 py-1 text-sm font-semibold"
                >
                  Mua ☕{c.price}
                </button>
              ) : (
                <button
                  onClick={() =>
                    act(
                      "/api/shop/equip",
                      { itemId: c.id, on: !equipped || c.kind === "hoodie" },
                      equipped ? "Đã cập nhật" : "Đã trang bị",
                    )
                  }
                  className={`rounded px-3 py-1 text-sm ${equipped ? "bg-[#2e7d32] text-white" : "border border-[#1b1b28]"}`}
                >
                  {equipped
                    ? c.kind === "hoodie"
                      ? "Đang mặc"
                      : "Đang đặt"
                    : c.kind === "hoodie"
                      ? "Mặc"
                      : "Đặt lên bàn"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
