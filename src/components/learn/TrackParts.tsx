"use client";

import { Check, Star, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** "01 Phần học — 02 Bài kiểm tra" with an exit button, for study-track lessons and exams. */
export function TrackStepper({
  exitHref,
  phase,
}: {
  exitHref: string;
  /** 0 = studying, 1 = testing, 2 = done */
  phase: 0 | 1 | 2;
}) {
  const dot = (n: 1 | 2) => {
    const done = phase >= n;
    const active = phase === n - 1;
    return (
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold sm:h-8 sm:w-8 ${
          done ? "bg-merged-soft text-merged" : active ? "bg-ink text-paper" : "bg-line text-muted"
        }`}
      >
        {done ? <Check size={14} aria-label="xong" /> : `0${n}`}
      </span>
    );
  };
  return (
    <div className="border-line bg-surface border-b shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 sm:gap-4 sm:py-3">
        <Link
          href={exitHref}
          aria-label="Thoát bài học"
          className="border-line text-muted hover:text-ink flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl border px-2.5 text-[0.7rem] font-semibold uppercase"
        >
          <X size={16} aria-hidden />
          Thoát
        </Link>
        <ol className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm">
          <li className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {dot(1)} <span>Phần học</span>
          </li>
          <li aria-hidden className={`h-0.5 flex-1 ${phase >= 1 ? "bg-merged" : "bg-line"}`} />
          <li
            className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${phase === 0 ? "text-muted" : ""}`}
          >
            {dot(2)} <span>Bài kiểm tra</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

/** The card before a test: how many questions, time per question, and the pass mark. */
export function TestIntro({
  eyebrow,
  title,
  text,
  total,
  passPct,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  total: number;
  passPct: number;
  children?: ReactNode;
}) {
  return (
    <div className="border-line bg-surface rounded-2xl border p-4 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem] sm:gap-6">
        <div>
          <p className="text-merged text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
          <h2 className="mt-1 text-[1.75rem] leading-tight font-bold">{title}</h2>
          <p className="text-muted mt-2">{text}</p>
          <p className="border-merged/30 bg-merged-soft mt-4 rounded-xl border px-4 py-3 text-sm">
            <strong>Từ 20 giây/câu, câu dài và trình độ cao được thêm giờ.</strong> Mỗi câu chỉ trả
            lời một lần; câu hết giờ được tính là chưa đúng và bài vẫn tiếp tục đến hết.
          </p>
        </div>
        <dl className="border-line grid grid-cols-2 gap-4 sm:grid-cols-1 sm:border-l sm:pl-6">
          <div>
            <dt className="text-muted text-sm">câu hỏi</dt>
            <dd className="text-[2rem] font-bold">{total}</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">cần đúng tối thiểu</dt>
            <dd className="text-[2rem] font-bold">
              {Math.ceil((passPct / 100) * total)}/{total}
            </dd>
          </div>
        </dl>
      </div>
      {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

export function StarRow({ n, size = 32 }: { n: number; size?: number }) {
  return (
    <span className="flex justify-center gap-1" aria-label={`${n}/3 sao`}>
      {[1, 2, 3].map((k) => (
        <Star
          key={k}
          size={size}
          className={k <= n ? "fill-gold text-gold" : "text-line"}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** Score card after a track test: percent, verdict, stars, XP and right/wrong counts. */
export function TrackResult({
  title,
  passed,
  pct,
  stars,
  xp,
  correct,
  total,
  passPct,
  note,
  actions,
}: {
  title: string;
  passed: boolean;
  pct: number;
  stars: number | null;
  xp: number;
  correct: number;
  total: number;
  passPct: number;
  note?: string;
  actions: ReactNode;
}) {
  const need = Math.ceil((passPct / 100) * total);
  return (
    <div role="status" className="text-center">
      <div
        className={`mx-auto grid h-32 w-32 place-items-center rounded-full border-8 text-[2rem] font-bold ${
          passed ? "border-merged bg-ink text-paper" : "border-bad/50 bg-surface"
        }`}
      >
        {passed ? (stars ? "I".repeat(stars) : "PASS") : `${pct}%`}
      </div>
      <p className={`mt-4 text-sm font-semibold uppercase ${passed ? "text-merged" : "text-bad"}`}>
        {passed ? (stars === null ? "Đã vượt cấp" : "Đã qua màn") : `Chưa đạt ${passPct}%`}
      </p>
      {stars !== null && (
        <div className="mt-2">
          <StarRow n={stars} />
        </div>
      )}
      <h1 className="mt-3 text-[1.9rem] leading-tight font-bold">{title}</h1>
      {!passed && (
        <p className="text-muted mt-2">
          Cần đúng ít nhất {need}/{total} câu. Kết quả lần này là {correct}/{total} câu.
        </p>
      )}
      {note && <p className="text-muted mx-auto mt-2 max-w-[55ch]">{note}</p>}
      <dl className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
        {[
          [`+${xp}`, "XP nhận được"],
          [`${correct}/${total}`, "Câu trả lời đúng"],
          [String(total - correct), "Câu trả lời chưa đúng"],
        ].map(([v, k]) => (
          <div key={k} className="border-line bg-surface rounded-xl border p-4">
            <dd className="text-2xl font-bold">{v}</dd>
            <dt className="text-muted text-sm">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-8">{actions}</div>
    </div>
  );
}
