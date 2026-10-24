"use client";

import { Check, ChevronLeft, Lock, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { btn, LESSON_KIND_VI } from "@/components/app/ui";
import { api } from "@/lib/client/api";
import { character } from "@/lib/characters";
import type { PathStage } from "@/lib/contracts/learn";

export function UnitClient({ slug }: { slug: string }) {
  const [stages, setStages] = useState<PathStage[] | null>(null);
  useEffect(() => {
    api.get<{ stages: PathStage[] }>("/api/path").then((p) => setStages(p.stages));
  }, []);
  if (!stages) return <p className="text-muted">Đang tải…</p>;
  const stage = stages.find((s) => s.units.some((u) => u.slug === slug));
  const unit = stage?.units.find((u) => u.slug === slug);
  if (!stage || !unit) return <p>Không tìm thấy unit này.</p>;
  const guide = character(unit.character);
  const next = unit.lessons.find((l) => l.state === "available");
  const canTestOut = unit.state === "available" || unit.state === "in_progress";

  return (
    <div>
      <Link href="/career/path" className={btn.ghost}>
        <ChevronLeft size={16} aria-hidden /> Lộ trình
      </Link>
      <header className="mt-4 flex gap-4">
        <span className="border-line bg-surface grid h-16 w-16 flex-none place-items-center rounded-2xl border">
          <Avatar id={unit.character} size={48} />
        </span>
        <div className="min-w-0">
          <p className="text-muted">
            <span className="font-mono">{unit.code}</span> · Chặng {stage.title.vi} · {unit.cefr}
          </p>
          <h1 className="text-[1.75rem] leading-tight font-bold">{unit.title.vi}</h1>
          <p className="text-muted mt-1">
            {unit.title.en} · cùng {guide.name}
          </p>
        </div>
      </header>

      <p className="mt-5 max-w-[65ch]">{unit.summary}</p>

      <section
        aria-labelledby="cando"
        className="border-line bg-surface mt-6 rounded-xl border p-4"
      >
        <h2 id="cando" className="font-semibold">
          Sau unit này, bạn có thể
        </h2>
        <ul className="mt-2 space-y-1.5">
          {unit.canDo.map((c) => (
            <li key={c} className="flex gap-2">
              <Check
                size={18}
                className={`mt-0.5 flex-none ${unit.state === "completed" ? "text-merged" : "text-line"}`}
                aria-hidden
              />
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lessons" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="lessons" className="text-xl font-bold">
            {unit.lessons.length} bài · khoảng {unit.minutes} phút
          </h2>
          {next && (
            <Link href={`/lesson/${next.id}`} className={btn.primary}>
              {unit.lessons[0]?.id === next.id ? "Bắt đầu unit" : "Học tiếp"}
            </Link>
          )}
        </div>
        <ol className="divide-line border-line bg-surface mt-4 divide-y rounded-xl border">
          {unit.lessons.map((l, i) => {
            const row = (
              <div className="flex items-center gap-4 px-4 py-3">
                <span
                  className={`grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-semibold ${
                    l.state === "completed"
                      ? "bg-merged text-white"
                      : l.state === "available"
                        ? "border-amber border-2"
                        : "border-line text-muted border-2"
                  }`}
                >
                  {l.state === "completed" ? (
                    <Check size={16} aria-label="Đã xong" />
                  ) : l.state === "locked" ? (
                    <Lock size={14} aria-label="Chưa mở" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${l.state === "locked" ? "text-muted" : ""}`}>
                    {l.title.vi}
                  </p>
                  <p className="text-muted text-sm">
                    {LESSON_KIND_VI[l.kind]} · {l.minutes} phút · {l.xp} XP
                  </p>
                </div>
                {l.stars > 0 && (
                  <span className="flex gap-0.5" aria-label={`${l.stars}/3 sao`}>
                    {[1, 2, 3].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        className={n <= l.stars ? "fill-gold text-gold" : "text-line"}
                        aria-hidden
                      />
                    ))}
                  </span>
                )}
              </div>
            );
            return (
              <li key={l.id}>
                {l.state === "locked" ? (
                  row
                ) : (
                  <Link href={`/lesson/${l.id}`} className="hover:bg-paper block">
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {canTestOut && (
        <section className="border-line mt-8 rounded-xl border border-dashed p-4">
          <h2 className="font-semibold">Đã vững nội dung này?</h2>
          <p className="text-muted mt-1 text-sm">
            Làm bài kiểm tra 8 câu, đúng từ 80% là qua unit ngay (không nhận XP bài học).
          </p>
          <Link href={`/exam/test-out/${unit.id}`} className={`${btn.secondary} mt-3`}>
            Kiểm tra để vượt unit
          </Link>
        </section>
      )}
    </div>
  );
}
