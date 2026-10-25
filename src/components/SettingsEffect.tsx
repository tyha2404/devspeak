"use client";

import { useEffect } from "react";
import { useSettings } from "@/stores/settingsStore";

const FONT_PX = { s: 16, m: 18, l: 20, xl: 24 };

/** Applies display settings to the document (theme, font size, reduced motion). */
export function SettingsEffect() {
  const fontScale = useSettings((s) => s.fontScale);
  const reduced = useSettings((s) => s.reducedMotion);
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    // Hydration's first render uses the server default; keep the persisted choice applied in head.
    const currentTheme = useSettings.getState().theme;
    if (currentTheme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = currentTheme;
  }, [theme]);
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
