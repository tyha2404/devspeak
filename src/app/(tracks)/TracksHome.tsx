"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GrowthTree } from "@/components/app/GrowthTree";
import { TrackCard } from "@/components/app/TrackCard";
import { btn } from "@/components/app/ui";
import { useMe } from "@/stores/meStore";

/** Front page of the study tracks: next grammar lesson, the growth tree, and both tracks. */
export function TracksHome() {
  const home = useMe((s) => s.home);
  useEffect(() => {
    void useMe.getState().load();
  }, []);
  if (!home) return null;
  const grammar = home.tracks.find((t) => t.track === "grammar");
  const vocab = home.tracks.find((t) => t.track === "vocab");
  const next = grammar?.next;
  const grammarHref = next?.lesson ? `/lesson/${next.lesson.id}` : "/grammar";

  return (
    <div className="space-y-8">
      <section className="border-line bg-surface grid gap-8 rounded-3xl border p-6 sm:p-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="text-[2.2rem] leading-[1.05] font-bold sm:text-[2.8rem]">
            Học theo từng chặng, <em className="text-merged not-italic">nhớ theo từng bài.</em>
          </h1>
          <p className="text-muted mt-4 max-w-[52ch]">
            Từ vựng và ngữ pháp nằm trong hai lộ trình riêng. Mỗi bài gồm phần học và phần kiểm tra;
            câu trả lời chưa đúng được lưu để ôn lại.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={grammarHref} className={btn.primary}>
              Học ngữ pháp →
            </Link>
            <Link href="/vocab" className={btn.secondary}>
              Học từ vựng
            </Link>
          </div>
        </div>

        {next?.lesson && next.unit && grammar && (
          <Link
            href={grammarHref}
            aria-label={`Mở bài ngữ pháp tiếp theo: ${next.lesson.title.en}`}
            className="bg-ink text-paper flex flex-col rounded-2xl p-5 hover:brightness-110"
          >
            <span className="flex items-center gap-3">
              <span className="bg-merged grid h-10 w-10 place-items-center rounded-lg font-mono font-bold">
                {next.unit.code}
              </span>
              <span className="text-xs font-semibold uppercase opacity-80">
                Bài học tiếp theo
                <span className="block normal-case opacity-80">Lộ trình ngữ pháp</span>
              </span>
            </span>
            <span className="mt-4 text-[1.5rem] leading-tight font-bold">
              {next.lesson.title.en}
            </span>
            <span className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <span className="bg-merged rounded-lg p-2">
                <span className="block font-semibold uppercase">01 · Đang học</span>Học kiến thức
              </span>
              <span className="rounded-lg border border-white/20 p-2 opacity-80">
                <span className="block font-semibold uppercase">02 · Tiếp theo</span>Kiểm tra
              </span>
            </span>
            <span className="mt-4 h-1 overflow-hidden rounded-full bg-white/20">
              <span
                className="bg-merged block h-full"
                style={{
                  width: `${(100 * grammar.lessons.done) / Math.max(1, grammar.lessons.total)}%`,
                }}
              />
            </span>
            <span className="mt-1 text-xs opacity-80">
              {grammar.lessons.done}/{grammar.lessons.total} bài đã hoàn thành
            </span>
          </Link>
        )}
      </section>

      <GrowthTree xp={home.growth.xp} max={home.growth.max} />

      <section aria-labelledby="choose-title">
        <h2 id="choose-title" className="text-[1.4rem] font-bold">
          Chọn nội dung học
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {grammar && <TrackCard t={grammar} />}
          {vocab && <TrackCard t={vocab} />}
        </div>
      </section>
    </div>
  );
}
