"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Panel } from "./Panel";

interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlockedAt: string | null;
}

export function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<Achievement[] | null>(null);
  useEffect(() => {
    api.get<Achievement[]>("/api/achievements").then(setList);
  }, []);
  const got = list?.filter((a) => a.unlockedAt).length ?? 0;
  return (
    <Panel title={`🏆 Thành tựu · ${got}/${list?.length ?? 0}`} onClose={onClose}>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list?.map((a) => (
          <li
            key={a.id}
            className={`rounded p-3 text-center ${a.unlockedAt ? "bg-white" : "bg-white/40 opacity-60"}`}
          >
            <p className="text-2xl" aria-hidden>
              {a.unlockedAt ? a.icon : "🔒"}
            </p>
            <p className="text-sm font-semibold">{a.title}</p>
            <p className="text-xs text-[#5c5c7a]">{a.desc}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
