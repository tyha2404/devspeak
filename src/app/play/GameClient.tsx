"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { HUD } from "@/components/overlay/HUD";
import { OverlayHost } from "@/components/overlay/OverlayHost";
import { TouchControls } from "@/components/overlay/TouchControls";
import { MAPS } from "@/game/data/maps";
import { EventBus } from "@/game/EventBus";
import type { InteractableKind } from "@/game/events";
import { REGISTRY_START, type GameStartData } from "@/game/startData";
import { api, fetchBootstrap, savePosition } from "@/lib/client/api";
import { ensureSession } from "@/lib/client/session";
import { createClient } from "@/lib/supabase/browser";
import type { Bootstrap } from "@/lib/contracts/bootstrap";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore, type Overlay } from "@/stores/uiStore";
import { useWorldStore, type SavedPosition } from "@/stores/worldStore";

// Phaser touches `window` at import time, so it must never be evaluated on the server.
const PhaserGame = dynamic(() => import("@/components/game/PhaserGame"), {
  ssr: false,
  loading: () => <Loading />,
});

const SERVER_SYNC_MS = 60_000;
export const MERGE_KEY = "dq:merge-guest";

function Loading({ text = "Đang vào văn phòng…" }: { text?: string }) {
  return <div className="fixed inset-0 grid place-items-center text-[#f4f1de]">{text}</div>;
}

/** Newest of the locally persisted and server-saved positions, if it points at a built map. */
const RANKS = ["intern", "junior", "mid", "senior", "techlead"];

function pickPosition(local: SavedPosition | null, server: SavedPosition | null, rank = "intern") {
  const allowed = (p: SavedPosition) => {
    const req = MAPS[p.mapKey]?.requires?.split(":")[1];
    return !req || RANKS.indexOf(rank) >= RANKS.indexOf(req);
  };
  const best = [local, server]
    .filter((p): p is SavedPosition => !!p && !!MAPS[p.mapKey]?.built && allowed(p))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return best ?? null;
}

/** In-world objects open the matching panel. */
const OBJECT_OVERLAY: Partial<Record<InteractableKind, NonNullable<Overlay>>> = {
  computer: { kind: "notebook" },
  whiteboard: { kind: "panel", panel: "daily" },
  sprintBoard: { kind: "panel", panel: "quests" },
  coffeeMachine: { kind: "panel", panel: "shop" },
  noticeBoard: { kind: "panel", panel: "achievements" },
  desk: { kind: "panel", panel: "promotion" },
  elevator: { kind: "panel", panel: "elevator" },
};

/** Where promotion bosses can be started: the HR desk, the client's demo screen, the conference stage. */
const BOSS_SPOTS = new Set(["interview-desk", "client-screen", "stage-screen"]);

/** A guest who signed into an existing account hands its progress over once (see LoginForm). */
async function mergePendingGuest() {
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(MERGE_KEY);
  } catch {}
  if (!token) return;
  const { data } = await createClient().auth.getUser();
  if (!data.user || data.user.is_anonymous) return;
  try {
    const r = await api.post<{ merged: boolean; xp?: number }>("/api/auth/merge-guest", {
      guestAccessToken: token,
    });
    if (r.merged) useUiStore.getState().toast(`🔗 Đã gộp tiến trình khách (+${r.xp ?? 0} XP)`);
  } finally {
    sessionStorage.removeItem(MERGE_KEY);
  }
}

function startDataFrom(
  boot: Bootstrap | null,
  pos: SavedPosition | null,
  flags: { debug: boolean; e2e: boolean; clock?: string },
): GameStartData {
  return {
    position: pos
      ? { mapKey: pos.mapKey, x: pos.x, y: pos.y, facing: pos.facing }
      : { mapKey: "office-floor" },
    level: boot?.profile.level ?? 1,
    unlocks: boot?.unlocks ?? [],
    avatar: boot?.profile.avatar ?? "player",
    deskItems: boot?.deskItems ?? [],
    npcsWithNew: boot?.npcsWithNew ?? [],
    ...flags,
  };
}

export default function GameClient() {
  const [start, setStart] = useState<GameStartData | null>(null);
  const [touch, setTouch] = useState(false);
  const [srsDue, setSrsDue] = useState(0);

  // Boot: guest session → (merge) → bootstrap → start position. The game still runs offline.
  useEffect(() => {
    let cancelled = false;
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const params = new URLSearchParams(window.location.search);
    const flags = {
      debug: params.has("debug"),
      e2e: params.has("e2e"),
      clock: params.get("clock") ?? undefined,
    };
    (async () => {
      let boot: Bootstrap | null = null;
      try {
        await ensureSession();
        await mergePendingGuest();
        boot = await fetchBootstrap();
        useProfileStore.getState().setProfile(boot.profile);
        setSrsDue(boot.srsDue);
      } catch (err) {
        console.warn("[devquest] offline mode:", err);
      }
      const pos = pickPosition(
        useWorldStore.getState().position,
        boot?.position ?? null,
        boot?.profile.rank,
      );
      if (cancelled) return;
      setStart(startDataFrom(boot, pos, flags));
      let dismissed = false;
      try {
        dismissed = !!localStorage.getItem("dq:placement-dismissed");
      } catch {}
      if (
        boot &&
        !boot.profile.placementDone &&
        boot.profile.xpTotal < 100 &&
        !dismissed &&
        // E2E skips the welcome panel unless a test asks for it with ?placement.
        (!flags.e2e || params.has("placement"))
      ) {
        useUiStore.getState().openOverlay({ kind: "panel", panel: "placement" });
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
        ui.openOverlay(
          BOSS_SPOTS.has(objectId)
            ? { kind: "panel", panel: "promotion" }
            : (OBJECT_OVERLAY[kind] ?? { kind: "object", objectId, objectKind: kind, label }),
        ),
      ),
      EventBus.on("door:locked", ({ requires, targetMap }) => {
        const rank = requires.split(":")[1] ?? requires;
        ui.toast(
          `🔒 ${MAPS[targetMap].displayName.vi}: cần cấp ${rank[0]!.toUpperCase()}${rank.slice(1)}`,
        );
      }),
      EventBus.on("interaction:target", ({ label }) => ui.setActionLabel(label)),
      EventBus.on("map:people", (p) => ui.setPeople(p)),
      EventBus.on("scene:changed", ({ mapKey, x, y, facing }) => {
        ui.setMapName(MAPS[mapKey].displayName.vi);
        world.setPosition({ mapKey, x, y, facing });
        syncServer();
      }),
      EventBus.on("player:moved", (p) => {
        world.setPosition(p);
        if (Date.now() - lastServerSync > SERVER_SYNC_MS) syncServer();
      }),
      // Rank/level changed (promotion, placement): refresh unlocks and rebuild the current map in place.
      EventBus.on("world:reload", async () => {
        const boot = await fetchBootstrap();
        useProfileStore.getState().setProfile(boot.profile);
        const pos = useWorldStore.getState().position;
        const data = startDataFrom(boot, pos, {
          debug: start.debug,
          e2e: start.e2e,
          clock: start.clock,
        });
        globalThis.__DQ_GAME__?.registry.set(REGISTRY_START, data);
        if (pos)
          EventBus.emit("map:goto", { mapKey: pos.mapKey, x: pos.x, y: pos.y, facing: pos.facing });
      }),
    ];
    // Closing a conversation may finish it: refresh the "!" markers.
    const unsub = useUiStore.subscribe((s, prev) => {
      if (prev.overlay?.kind === "dialogue" && !s.overlay) {
        fetchBootstrap()
          .then((b) => {
            EventBus.emit("npc:markers", { npcIds: b.npcsWithNew });
            setSrsDue(b.srsDue);
          })
          .catch(() => {});
      }
    });
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "n" || e.key === "N") && !useUiStore.getState().overlay)
        ui.openOverlay({ kind: "notebook" });
    };
    window.addEventListener("keydown", onKey);
    const onHide = () => {
      if (document.visibilityState === "hidden") syncServer(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      offs.forEach((off) => off());
      unsub();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("keydown", onKey);
    };
  }, [start]);

  if (!start) return <Loading />;

  return (
    <main className="bg-[#1b1b28]">
      <PhaserGame start={start} />
      <div className="pointer-events-none fixed inset-0">
        <HUD touch={touch} srsDue={srsDue} />
        {touch && <TouchControls />}
        <OverlayHost />
      </div>
    </main>
  );
}
