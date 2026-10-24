"use client";

import { useTranslations } from "next-intl";
import { NPCS } from "@/game/data/npcs";
import { EventBus } from "@/game/EventBus";
import { useUiStore } from "@/stores/uiStore";
import { Panel } from "./panels/Panel";

/** Menu mode: every person and object on this map as a button (screen readers, motor impairments). */
export function PeoplePanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("hud");
  const people = useUiStore((s) => s.people);
  const go = (kind: "npc" | "object", id: string) => {
    onClose();
    // Let the overlay close (and input unlock) before interacting.
    setTimeout(() => EventBus.emit("menu:interact", { kind, id }), 300);
  };
  return (
    <Panel title={t("people")} onClose={onClose}>
      <ul className="space-y-2">
        {people.npcs.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => go("npc", n.id)}
              className="w-full rounded bg-white px-3 py-2 text-left"
            >
              💬 {n.name} · {NPCS[n.id]?.role.vi}
            </button>
          </li>
        ))}
        {people.objects.map((o) => (
          <li key={o.objectId}>
            <button
              onClick={() => go("object", o.objectId)}
              className="w-full rounded bg-white px-3 py-2 text-left"
            >
              🔎 {o.label}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
