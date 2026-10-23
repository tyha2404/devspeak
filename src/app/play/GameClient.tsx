"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DialogBox } from "@/components/overlay/DialogBox";
import { HUD } from "@/components/overlay/HUD";
import { TouchControls } from "@/components/overlay/TouchControls";
import { MAPS } from "@/game/data/maps";
import { EventBus } from "@/game/EventBus";
import type { GameStartData } from "@/game/startData";
import { fetchBootstrap, savePosition } from "@/lib/client/api";
import { ensureSession } from "@/lib/client/session";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { useWorldStore, type SavedPosition } from "@/stores/worldStore";

// Phaser touches `window` at import time, so it must never be evaluated on the server.
const PhaserGame = dynamic(() => import("@/components/game/PhaserGame"), {
  ssr: false,
  loading: () => <Loading />,
});

const SERVER_SYNC_MS = 60_000;

function Loading({ text = "Đang vào văn phòng…" }: { text?: string }) {
  return <div className="fixed inset-0 grid place-items-center text-[#f4f1de]">{text}</div>;
}

/** Newest of the locally persisted and server-saved positions, if it points at a built map. */
function pickPosition(local: SavedPosition | null, server: SavedPosition | null) {
  const best = [local, server]
    .filter((p): p is SavedPosition => !!p && !!MAPS[p.mapKey]?.built)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return best ?? null;
}

export default function GameClient() {
  const [start, setStart] = useState<GameStartData | null>(null);
  const [touch, setTouch] = useState(false);

  // Boot: guest session → bootstrap → start position. The game still runs offline.
  useEffect(() => {
    let cancelled = false;
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const params = new URLSearchParams(window.location.search);
    const debug = params.has("debug");
    const e2e = params.has("e2e");
    (async () => {
      const local = useWorldStore.getState().position;
      let level = 1;
      let unlocks: string[] = [];
      let server: SavedPosition | null = null;
      try {
        await ensureSession();
        const boot = await fetchBootstrap();
        useProfileStore.getState().setProfile(boot.profile);
        level = boot.profile.level;
        unlocks = boot.unlocks;
        server = boot.position;
      } catch (err) {
        console.warn("[devquest] offline mode:", err);
      }
      const pos = pickPosition(local, server);
      if (!cancelled) {
        setStart({
          position: pos
            ? { mapKey: pos.mapKey, x: pos.x, y: pos.y, facing: pos.facing }
            : { mapKey: "office-floor" },
          level,
          unlocks,
          debug,
          e2e,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Game → UI wiring and position persistence.
  useEffect(() => {
    if (!start) return;
    const ui = useUiStore.getState();
    const world = useWorldStore.getState();
    let lastServerSync = 0;
    const syncServer = (beacon = false) => {
      const p = useWorldStore.getState().position;
      if (!p) return;
      lastServerSync = Date.now();
      savePosition({ mapKey: p.mapKey, x: p.x, y: p.y, facing: p.facing }, { beacon });
    };

    const offs = [
      EventBus.on("npc:interact", ({ npcId }) => ui.openOverlay({ kind: "dialogue", npcId })),
      EventBus.on("object:interact", ({ objectId, kind, label }) =>
        ui.openOverlay({ kind: "object", objectId, objectKind: kind, label }),
      ),
      EventBus.on("door:locked", ({ requires, targetMap }) => {
        const rank = requires.split(":")[1] ?? requires;
        ui.toast(
          `🔒 ${MAPS[targetMap].displayName.vi}: cần cấp ${rank[0]!.toUpperCase()}${rank.slice(1)}`,
        );
      }),
      EventBus.on("interaction:target", ({ label }) => ui.setActionLabel(label)),
      EventBus.on("scene:changed", ({ mapKey, x, y, facing }) => {
        ui.setMapName(MAPS[mapKey].displayName.vi);
        world.setPosition({ mapKey, x, y, facing });
        syncServer();
      }),
      EventBus.on("player:moved", (p) => {
        world.setPosition(p);
        if (Date.now() - lastServerSync > SERVER_SYNC_MS) syncServer();
      }),
    ];
    const onHide = () => {
      if (document.visibilityState === "hidden") syncServer(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      offs.forEach((off) => off());
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [start]);

  if (!start) return <Loading />;

  return (
    <main className="bg-[#1b1b28]">
      <PhaserGame start={start} />
      <div className="pointer-events-none fixed inset-0">
        <HUD touch={touch} />
        {touch && <TouchControls />}
        <DialogBox />
      </div>
    </main>
  );
}
