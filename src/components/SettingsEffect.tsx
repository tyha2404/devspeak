"use client";

import { useEffect } from "react";
import { useSettings } from "@/stores/settingsStore";

const FONT_PX = { s: 16, m: 18, l: 20, xl: 24 };

/** Applies accessibility settings to the document (font size, reduced motion). */
export function SettingsEffect() {
  const fontScale = useSettings((s) => s.fontScale);
  const reduced = useSettings((s) => s.reducedMotion);
  useEffect(() => {
    document.documentElement.style.setProperty("--dq-font-base", `${FONT_PX[fontScale]}px`);
  }, [fontScale]);
  useEffect(() => {
    // Follow the OS setting the first time; afterwards the user's toggle wins.
    try {
      if (
        !localStorage.getItem("dq:settings") &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        useSettings.getState().set({ reducedMotion: true });
      }
    } catch {}
    document.documentElement.dataset.reducedMotion = reduced ? "1" : "0";
  }, [reduced]);
  return null;
}
