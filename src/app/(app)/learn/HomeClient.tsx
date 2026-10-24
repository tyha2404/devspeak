"use client";

import { Flame, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { GoalRing } from "@/components/app/AppShell";
import { PathGraph } from "@/components/app/PathGraph";
import { btn, LESSON_KIND_VI } from "@/components/app/ui";
import { api } from "@/lib/client/api";
import { character } from "@/lib/characters";
import type { PathStage } from "@/lib/contracts/learn";
import { useMe } from "@/stores/meStore";

export function HomeClient() {
  const home = useMe((s) => s.home);
  const [path, setPath] = useState<{ stages: PathStage[] } | null>(null);

  useEffect(() => {
    void useMe.getState().load();
    api
      .get<{ stages: PathStage[] }>("/api/path")
      .then(setPath)
      .catch(() => {});
  }, []);

  if (!home) return null;
  const { me, next } = home;
  const stage = path?.stages.find((s) => s.id === next?.stage.id) ?? path?.stages[0];
  const guide = next?.unit ? character(next.unit.character) : null;

  return (
    <div className="space-y-10">
      <section aria-labelledby="next-title">
        {next?.type === "lesson" && next.unit && next.lesson ? (
          <div className="border-line bg-surface rounded-2xl border p-5 sm:p-7">
            <p className="text-muted">
              <span className="font-mono">{next.unit.code}</span> · {next.stage.title.vi}
            </p>
            <h1
              id="next-title"
              className="mt-2 text-[1.75rem] leading-tight font-bold sm:text-[2rem]"
            >
              {next.unit.title.vi}
            </h1>
            <p className="mt-2">
              Bài {next.index}/{next.total}:{" "}
              <span className="font-semibold">{next.lesson.title.vi}</span>
              <span className="text-muted">
                {" "}
                · {LESSON_KIND_VI[next.lesson.kind]} · khoảng {next.lesson.minutes} phút
              </span>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href={`/lesson/${next.lesson.id}`} className={btn.primary}>
                {next.index === 1 ? "Bắt đầu" : "Học tiếp"}
              </Link>
              {guide && (
                <span className="text-muted flex items-center gap-2 text-sm">
                  <Avatar id={guide.id} size={32} />
                  cùng {guide.name}, {guide.role.vi.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        ) : next?.type === "checkpoint" ? (
          <div className="border-line bg-surface rounded-2xl border p-5 sm:p-7">
            <h1 id="next-title" className="text-[1.75rem] font-bold">
              Bạn đã học hết chặng {next.stage.title.vi}
            </h1>
            <p className="text-muted mt-2">
              Làm bài checkpoint để nhận chứng nhận và chốt chặng này.
            </p>
            <Link href={`/exam/checkpoint/${next.stage.id}`} className={`${btn.primary} mt-6`}>
              Làm bài checkpoint
            </Link>
          </div>
        ) : (
          <div className="border-line bg-surface rounded-2xl border p-5 sm:p-7">
            <h1 id="next-title" className="text-[1.75rem] font-bold">
              Bạn đã học hết nội dung hiện có
            </h1>
            <p className="text-muted mt-2">
              Unit mới đang được soạn. Trong lúc chờ, hãy ôn tập và luyện tình huống.
            </p>
          </div>
        )}
      </section>

      <section aria-label="Hôm nay" className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="border-line bg-surface flex flex-col items-start gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
          <GoalRing value={me.todayXp} goal={me.dailyGoal} size={44} />
          <div>
            <p className="font-semibold">
              {me.todayXp}/{me.dailyGoal} XP
            </p>
            <p className="text-muted hidden text-sm sm:block">
              {me.todayXp >= me.dailyGoal ? "Đạt mục tiêu hôm nay" : "Mục tiêu hôm nay"}
            </p>
          </div>
        </div>
        <div className="border-line bg-surface flex flex-col items-start gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
          <Flame size={28} className={me.streak > 0 ? "text-amber" : "text-muted"} aria-hidden />
          <div>
            <p className="font-semibold">{me.streak} ngày</p>
            <p className="text-muted hidden text-sm sm:block">
              {me.streakFreezes > 0 ? `${me.streakFreezes} lần giữ streak` : "Học liên tiếp"}
            </p>
          </div>
        </div>
        <Link
          href="/review"
          className="border-line bg-surface hover:border-amber/60 flex flex-col items-start gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4"
        >
          <RotateCcw
            size={26}
            className={home.srsDue > 0 ? "text-merged" : "text-muted"}
            aria-hidden
          />
          <div>
            <p className="font-semibold">{home.srsDue} từ cần ôn</p>
            <p className="text-muted hidden text-sm sm:block">
              {home.srsDue > 0 ? "Ôn ngay để không quên" : "Chưa có từ đến hạn"}
            </p>
          </div>
        </Link>
      </section>

      {stage && (
        <section aria-label="Chặng hiện tại">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-muted text-sm">
              Lộ trình: {home.overall.done}/{home.overall.total} unit đã xong
            </p>
            <Link href="/path" className={btn.ghost}>
              Xem toàn bộ lộ trình
            </Link>
          </div>
          <PathGraph stages={[stage]} currentUnitId={next?.unit?.id} />
        </section>
      )}
    </div>
  );
}
