"use client";

import { useTranslations } from "next-intl";
import { levelProgress } from "@/game/config/progression";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

const RANK_LABEL = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  techlead: "Tech Lead",
};

export function HUD({ touch, srsDue = 0 }: { touch: boolean; srsDue?: number }) {
  const actionLabel = useUiStore((s) => s.actionLabel);
  const overlay = useUiStore((s) => s.overlay);
  const mapName = useUiStore((s) => s.mapName);
  const toasts = useUiStore((s) => s.toasts);
  const profile = useProfileStore((s) => s.profile);
  const t = useTranslations("hud");

  const progress = levelProgress(profile?.xpTotal ?? 0);
  const pct = progress.needed ? Math.round((progress.current / progress.needed) * 100) : 100;

  const rank = profile?.rank ?? "intern";
  const tools = [
    { label: t("people"), key: null, icon: "👥", open: { kind: "people" } as const },
    { label: t("notebook"), key: "N", icon: "📒", open: { kind: "notebook" } as const },
    {
      label: t("quests"),
      key: null,
      icon: "🗂️",
      open: { kind: "panel", panel: "quests" } as const,
    },
    {
      label: t("settings"),
      key: null,
      icon: "⚙️",
      open: { kind: "panel", panel: "settings" } as const,
    },
  ];
  const tool =
    "relative grid h-10 w-10 place-items-center rounded text-lg hover:bg-white/10 focus-visible:bg-white/15 sm:h-11 sm:w-11";

  return (
    <>
      <div className="dq-hud fixed top-2 left-2 flex w-[min(15rem,calc(100vw-5rem))] items-center gap-3 p-2 sm:top-3 sm:left-3 sm:w-72">
        <div
          aria-hidden
          className="grid h-11 w-11 flex-none place-items-center rounded bg-[#f2a65a] text-lg font-black text-[#1b1b28] shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)]"
        >
          {profile?.level ?? 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-bold">
              {RANK_LABEL[rank]}{" "}
              <span className="font-normal text-white/60">· L{profile?.level ?? 1}</span>
            </span>
            <span className="text-[11px] text-white/60 tabular-nums">
              {progress.needed ? `${progress.current}/${progress.needed} XP` : "MAX"}
            </span>
          </div>
          <div
            className="mt-1 h-2.5 overflow-hidden rounded-sm border border-black/40 bg-white/15"
            role="progressbar"
            aria-label="XP"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-gradient-to-r from-[#f2a65a] to-[#ffd166] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex gap-3 text-xs text-white/85">
            <span title="Coffee Beans">☕ {profile?.coins ?? 0}</span>
            <span title="Streak">🔥 {profile?.streak ?? 0}</span>
            <span className="truncate text-white/60">📍 {mapName ?? ""}</span>
          </div>
        </div>
      </div>

      <nav
        aria-label="Menu"
        className="dq-hud pointer-events-auto fixed top-2 right-2 flex flex-col gap-0.5 p-1 sm:top-3 sm:right-3 sm:flex-row"
      >
        {tools.map((b) => (
          <button
            key={b.label}
            onClick={() => useUiStore.getState().openOverlay(b.open)}
            aria-label={b.label}
            title={b.key ? `${b.label} (${b.key})` : b.label}
            className={tool}
          >
            {b.icon}
          </button>
        ))}
        <span
          aria-hidden
          className="mx-2 my-0.5 h-px bg-white/15 sm:mx-0.5 sm:my-2 sm:h-auto sm:w-px"
        />
        <a href="/review" aria-label={t("review")} title={t("review")} className={tool}>
          🔁
          {srsDue > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-[#e5484d] px-1 text-center text-[10px] font-bold text-white">
              {srsDue}
            </span>
          )}
        </a>
        <a href="/profile" aria-label={t("profile")} title={t("profile")} className={tool}>
          👤
        </a>
      </nav>

      {actionLabel && !overlay && !touch && (
        <div className="dq-hud fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 px-3 py-1.5 text-sm">
          <span className="dq-key">
            <span className="sr-only">[</span>E<span className="sr-only">]</span>
          </span>{" "}
          {actionLabel}
        </div>
      )}

      <div
        aria-live="polite"
        className="fixed top-20 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 sm:top-3"
      >
        {toasts.map((t) => (
          <div key={t.id} className="dq-hud border-[#f2a65a]/60 px-4 py-2 text-sm font-medium">
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
