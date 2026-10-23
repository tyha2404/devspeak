"use client";

import { useLayoutEffect, useRef } from "react";
import type { Game } from "phaser";
import { createGame } from "@/game/main";
import type { GameStartData } from "@/game/startData";

declare global {
  var __DQ_GAME__: Game | undefined;
}

/** Mounts exactly one Phaser.Game, safe under StrictMode double-mount and HMR. */
export default function PhaserGame({ start }: { start: GameStartData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(start);

  useLayoutEffect(() => {
    // A previous module version (HMR) may have left an instance behind.
    globalThis.__DQ_GAME__?.destroy(true);
    const game = createGame(containerRef.current!, startRef.current);
    globalThis.__DQ_GAME__ = game;
    return () => {
      game.destroy(true);
      if (globalThis.__DQ_GAME__ === game) globalThis.__DQ_GAME__ = undefined;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="DevQuest game world"
      className="fixed inset-0 h-dvh touch-none outline-none [&_canvas]:[image-rendering:pixelated]"
    />
  );
}
