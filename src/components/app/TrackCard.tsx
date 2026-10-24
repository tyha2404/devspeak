import Link from "next/link";
import { btn } from "@/components/app/ui";
import type { TrackSummary } from "@/lib/contracts/learn";

/** One study track's progress and its next lesson. */
export function TrackCard({ t }: { t: TrackSummary }) {
  const n = t.next;
  return (
    <div className="border-line bg-surface flex flex-col rounded-2xl border p-5">
      <p className="text-muted text-xs font-semibold tracking-wide uppercase">
        {t.track === "grammar" ? "A1 → C2" : `${t.units} chủ đề`}
      </p>
      <h3 className="mt-1 text-lg font-bold">{t.title.vi}</h3>
      <p className="text-muted mt-1 text-sm">{t.tagline}</p>
      <div
        className="bg-line mt-4 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`${t.lessons.done}/${t.lessons.total} bài đã hoàn thành`}
        aria-valuenow={t.lessons.done}
        aria-valuemin={0}
        aria-valuemax={t.lessons.total}
      >
        <div
          className="bg-merged h-full rounded-full"
          style={{ width: `${(100 * t.lessons.done) / Math.max(1, t.lessons.total)}%` }}
        />
      </div>
      <p className="text-muted mt-1 text-xs">
        {t.lessons.done}/{t.lessons.total} bài đã hoàn thành
      </p>
      {n?.lesson && n.unit && (
        <p className="mt-3 text-sm">
          Tiếp theo: <span className="font-mono">{n.unit.code}</span> ·{" "}
          <span className="font-semibold">{n.lesson.title.en}</span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        {n?.lesson && (
          <Link href={`/lesson/${n.lesson.id}`} className={btn.secondary}>
            {t.track === "grammar" ? "Học ngữ pháp" : "Học từ vựng"}
          </Link>
        )}
        <Link href={`/${t.track}`} className={btn.ghost}>
          Xem lộ trình →
        </Link>
      </div>
    </div>
  );
}
