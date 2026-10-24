"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { applyAward } from "@/lib/client/progress";
import { useUiStore } from "@/stores/uiStore";
import { Panel } from "./Panel";

interface Quest {
  id: string;
  quest_key: string;
  period_key: string;
  kind: "daily" | "weekly";
  goal: number;
  progress: number;
  reward_xp: number;
  reward_coins: number;
  completed_at: string | null;
  claimed_at: string | null;
  title: { en: string; vi: string };
}

export function QuestsPanel({ onClose }: { onClose: () => void }) {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const toast = useUiStore((s) => s.toast);
  const load = useCallback(
    () => api.get<{ quests: Quest[] }>("/api/quests").then((r) => setQuests(r.quests)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const claim = async (q: Quest) => {
    applyAward(await api.post("/api/quests/claim", { key: q.quest_key, period: q.period_key }));
    toast(`+${q.reward_xp} XP · ☕ +${q.reward_coins}`);
    void load();
  };

  const groups = [
    { label: "Sprint hôm nay", items: quests?.filter((q) => q.kind === "daily") ?? [] },
    { label: "Sprint tuần", items: quests?.filter((q) => q.kind === "weekly") ?? [] },
  ];
  return (
    <Panel title="🗂️ Sprint Board" onClose={onClose}>
      {!quests && <p>Đang tải…</p>}
      {groups.map((g) => (
        <section key={g.label} className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-[#5c5c7a]">{g.label}</h3>
          <ul className="space-y-2">
            {g.items.map((q) => (
              <li key={q.quest_key} className="rounded border-l-4 border-[#0052cc] bg-white p-3">
                <div className="flex items-center justify-between">
                  <p>
                    <span className="mr-2 text-xs text-[#0052cc]">{q.id}</span>
                    {q.title.vi}
                  </p>
                  {q.claimed_at ? (
                    <span className="text-xs text-[#2e7d32]">✓ Done</span>
                  ) : q.completed_at ? (
                    <button
                      onClick={() => claim(q)}
                      className="rounded bg-[#2e7d32] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Nhận thưởng
                    </button>
                  ) : (
                    <span className="text-xs text-[#5c5c7a]">In progress</span>
                  )}
                </div>
                <div
                  className="mt-2 h-1.5 rounded bg-[#e0e0e0]"
                  role="progressbar"
                  aria-valuenow={q.progress}
                  aria-valuemax={q.goal}
                >
                  <div
                    className="h-1.5 rounded bg-[#0052cc]"
                    style={{ width: `${(q.progress / q.goal) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[#5c5c7a]">
                  {q.progress}/{q.goal} · +{q.reward_xp} XP · ☕ {q.reward_coins}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Panel>
  );
}
