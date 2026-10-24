"use client";

import { useEffect } from "react";
import { EventBus } from "@/game/EventBus";
import { useGlossary } from "@/stores/glossaryStore";
import { useUiStore } from "@/stores/uiStore";
import { DialogueOverlay } from "./DialogueOverlay";
import { NotebookPanel } from "./NotebookPanel";
import { PeoplePanel } from "./PeoplePanel";
import { ObjectPanel } from "./ObjectPanel";
import { AchievementsPanel } from "./panels/AchievementsPanel";
import { DailyWordsPanel } from "./panels/DailyWordsPanel";
import { ElevatorPanel } from "./panels/ElevatorPanel";
import { PlacementPanel } from "./panels/PlacementPanel";
import { PromotionPanel } from "./panels/PromotionPanel";
import { QuestsPanel } from "./panels/QuestsPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { ShopPanel } from "./panels/ShopPanel";
import { WordPopover } from "./WordPopover";

const PANELS = {
  daily: DailyWordsPanel,
  quests: QuestsPanel,
  shop: ShopPanel,
  achievements: AchievementsPanel,
  promotion: PromotionPanel,
  placement: PlacementPanel,
  settings: SettingsPanel,
  elevator: ElevatorPanel,
};

/** Owns the "an overlay is open" state: locks game input and handles Escape. */
export function OverlayHost() {
  const overlay = useUiStore((s) => s.overlay);
  const close = useUiStore((s) => s.closeOverlay);

  useEffect(() => {
    if (!overlay) return;
    EventBus.emit("input:lock", { reason: overlay.kind === "dialogue" ? "dialogue" : "menu" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const g = useGlossary.getState();
      if (g.open) g.close();
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      EventBus.emit("input:unlock");
    };
  }, [overlay, close]);

  return (
    <>
      {overlay?.kind === "dialogue" && (
        <DialogueOverlay key={overlay.npcId} npcId={overlay.npcId} onClose={close} />
      )}
      {overlay?.kind === "notebook" && <NotebookPanel onClose={close} />}
      {overlay?.kind === "people" && <PeoplePanel onClose={close} />}
      {overlay?.kind === "panel" &&
        (() => {
          const P = PANELS[overlay.panel];
          return <P onClose={close} />;
        })()}
      {overlay?.kind === "object" && (
        <ObjectPanel kind={overlay.objectKind} label={overlay.label} onClose={close} />
      )}
      <WordPopover />
    </>
  );
}
