"use client";

import { MAPS } from "@/game/data/maps";
import { EventBus } from "@/game/EventBus";
import type { MapKey } from "@/game/events";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { Panel } from "./Panel";

const RANKS = ["intern", "junior", "mid", "senior", "techlead"];
const RANK_VI: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  techlead: "Tech Lead",
};

/** Elevator: pick a floor; locked floors show the rank they need. */
export function ElevatorPanel({ onClose }: { onClose: () => void }) {
  const rank = useProfileStore((s) => s.profile?.rank ?? "intern");
  const current = useUiStore((s) => s.mapName);
  const floors = Object.values(MAPS).filter((m) => m.elevator && m.built);
  const open = (req?: string) => !req || RANKS.indexOf(rank) >= RANKS.indexOf(req.split(":")[1]!);

  const go = (key: MapKey) => {
    onClose();
    setTimeout(() => EventBus.emit("map:goto", { mapKey: key, spawnId: "from-elevator" }), 300);
  };

  return (
    <Panel title="🛗 Thang máy" onClose={onClose}>
      <ul className="space-y-2">
        {floors.map((m, i) => {
          const ok = open(m.requires);
          const here = current === m.displayName.vi;
          return (
            <li key={m.key}>
              <button
                disabled={!ok || here}
                onClick={() => go(m.key)}
                className="flex w-full items-center justify-between rounded bg-white px-3 py-2 text-left disabled:opacity-50"
              >
                <span>
                  <b className="mr-2">{floors.length - i}F</b>
                  {m.displayName.vi}
                </span>
                <span className="text-xs">
                  {here
                    ? "Bạn đang ở đây"
                    : ok
                      ? "Đi →"
                      : `🔒 cần ${RANK_VI[m.requires!.split(":")[1]!]}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
