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

  return (
    <>
      <div className="fixed top-3 left-3 w-56 rounded bg-black/60 px-3 py-2 text-sm text-white">
        <div className="flex justify-between">
          <span className="font-semibold">
            {RANK_LABEL[profile?.rank ?? "intern"]} · L{profile?.level ?? 1}
          </span>
          <span title="Coffee Beans">☕ {profile?.coins ?? 0}</span>
        </div>
        <div
          className="mt-1 h-2 rounded bg-white/20"
          role="progressbar"
          aria-label="XP"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-2 rounded bg-[#f2a65a]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-white/80">
          <span>{mapName ?? ""}</span>
          <span>🔥 {profile?.streak ?? 0}</span>
        </div>
      </div>

      <div className="pointer-events-auto fixed top-3 right-3 flex gap-2">
        {[
          { label: t("people"), title: t("people"), icon: "👥", open: { kind: "people" } as const },
          {
            label: t("notebook"),
            title: `${t("notebook")} (N)`,
            icon: "📒",
            open: { kind: "notebook" } as const,
          },
          {
            label: t("quests"),
            title: t("quests"),
            icon: "🗂️",
            open: { kind: "panel", panel: "quests" } as const,
          },
          {
            label: t("settings"),
            title: t("settings"),
            icon: "⚙️",
            open: { kind: "panel", panel: "settings" } as const,
          },
        ].map((b) => (
          <button
            key={b.label}
            onClick={() => useUiStore.getState().openOverlay(b.open)}
            aria-label={b.label}
            title={b.title}
            className="rounded bg-black/60 px-3 py-2 text-sm text-white hover:bg-black/80"
          >
            {b.icon}
          </button>
        ))}
        <a
          href="/review"
          aria-label={t("review")}
          title={t("review")}
          className="relative rounded bg-black/60 px-3 py-2 text-sm text-white hover:bg-black/80"
        >
          🔁
          {srsDue > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full bg-[#c62828] px-1.5 text-[10px]">
              {srsDue}
            </span>
          )}
        </a>
        <a
          href="/profile"
          aria-label={t("profile")}
          title={t("profile")}
          className="rounded bg-black/60 px-3 py-2 text-sm text-white hover:bg-black/80"
        >
          👤
        </a>
      </div>

      {actionLabel && !overlay && !touch && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/70 px-3 py-1 text-sm text-white">
          [E] {actionLabel}
        </div>
      )}

      <div
        aria-live="polite"
        className="fixed top-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded bg-[#1b1b28]/90 px-4 py-2 text-sm text-[#f4f1de] shadow"
          >
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
