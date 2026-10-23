"use client";

import { useRef, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { inputBridge } from "@/game/inputBridge";
import { useUiStore } from "@/stores/uiStore";

const RADIUS = 56;

/**
 * Floating virtual joystick (left half) + action button (bottom right).
 * The joystick writes straight into `inputBridge` so movement never re-renders React.
 */
export function TouchControls() {
  const actionLabel = useUiStore((s) => s.actionLabel);
  const overlay = useUiStore((s) => s.overlay);
  const [origin, setOrigin] = useState<{ x: number; y: number; left: number; top: number } | null>(
    null,
  );
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  const release = () => {
    pointerId.current = null;
    inputBridge.joystick.x = 0;
    inputBridge.joystick.y = 0;
    setOrigin(null);
  };

  if (overlay) return null;

  return (
    <>
      <div
        className="pointer-events-auto fixed bottom-0 left-0 h-1/2 w-1/2 touch-none"
        onPointerDown={(e) => {
          if (pointerId.current !== null) return;
          pointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          setOrigin({
            x: e.clientX,
            y: e.clientY,
            left: e.clientX - rect.left,
            top: e.clientY - rect.top,
          });
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== pointerId.current || !origin) return;
          let dx = e.clientX - origin.x;
          let dy = e.clientY - origin.y;
          const len = Math.hypot(dx, dy);
          if (len > RADIUS) {
            dx = (dx / len) * RADIUS;
            dy = (dy / len) * RADIUS;
          }
          inputBridge.joystick.x = dx / RADIUS;
          inputBridge.joystick.y = dy / RADIUS;
          if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {origin && (
          <div
            className="absolute grid place-items-center rounded-full border-2 border-white/40 bg-white/10"
            style={{
              left: origin.left - RADIUS,
              top: origin.top - RADIUS,
              width: RADIUS * 2,
              height: RADIUS * 2,
            }}
          >
            <div ref={knobRef} className="h-12 w-12 rounded-full bg-white/60" />
          </div>
        )}
      </div>
      <button
        aria-label={actionLabel ?? "Action"}
        disabled={!actionLabel}
        onClick={() => EventBus.emit("player:interact")}
        className="pointer-events-auto fixed right-6 bottom-8 grid h-16 w-16 place-items-center rounded-full bg-[#f2a65a] text-xs font-bold text-[#1b1b28] shadow-lg disabled:opacity-40"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {actionLabel ? actionLabel.split(" ")[0] : "•"}
      </button>
    </>
  );
}
