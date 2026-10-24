"use client";

import { useEffect, useState } from "react";
import { PathGraph } from "@/components/app/PathGraph";
import { api } from "@/lib/client/api";
import type { NextStep, PathStage } from "@/lib/contracts/learn";

export function PathClient() {
  const [path, setPath] = useState<{ stages: PathStage[]; next: NextStep | null } | null>(null);
  useEffect(() => {
    api.get<{ stages: PathStage[]; next: NextStep | null }>("/api/path").then(setPath);
  }, []);
  const units = path?.stages.flatMap((s) => s.units) ?? [];
  const minutes = units.filter((u) => u.state !== "coming_soon").reduce((n, u) => n + u.minutes, 0);
  return (
    <div>
      <h1 className="text-[1.75rem] font-bold">Lộ trình A2 → B2</h1>
      <p className="text-muted mt-2 max-w-[60ch]">
        4 chặng, mỗi chặng xen kẽ tình huống công việc và kiến thức kỹ thuật bằng tiếng Anh. Học
        theo thứ tự, hoặc làm bài kiểm tra để vượt qua unit bạn đã vững.
        {minutes > 0 && ` Phần đã mở hiện có khoảng ${Math.round(minutes / 60)} giờ học.`}
      </p>
      <div className="mt-8">
        {path ? (
          <PathGraph stages={path.stages} currentUnitId={path.next?.unitId} />
        ) : (
          <p className="text-muted">Đang tải…</p>
        )}
      </div>
      <p className="text-muted mt-2 text-sm">
        Hình tròn: tình huống giao tiếp · hình vuông: kiến thức kỹ thuật · hình thoi: checkpoint của
        chặng
      </p>
    </div>
  );
}
