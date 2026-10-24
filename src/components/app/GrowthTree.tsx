// A tree that grows with total XP against all first-completion lesson XP, in six stages.
const STAGES = [
  { label: "Hạt giống", at: 0 },
  { label: "Nảy mầm", at: 0.03 },
  { label: "Phát triển thân", at: 0.12 },
  { label: "Phân cành", at: 0.28 },
  { label: "Ra lá", at: 0.52 },
  { label: "Kết trái", at: 0.78 },
];

export function growthStage(xp: number, max: number) {
  const ratio = max > 0 ? Math.min(1, xp / max) : 0;
  const i = STAGES.reduce((n, s, k) => (ratio >= s.at ? k : n), 0);
  const next = STAGES[i + 1];
  return {
    index: i,
    label: STAGES[i]!.label,
    nextLabel: next?.label ?? null,
    toNext: next ? Math.max(0, Math.ceil(next.at * max - xp)) : 0,
    pct: Math.round(ratio * 100),
  };
}

export function GrowthTree({ xp, max }: { xp: number; max: number }) {
  const g = growthStage(xp, max);
  const k = g.index;
  return (
    <div className="border-line bg-surface grid gap-6 rounded-2xl border p-5 sm:grid-cols-[1fr_9rem] sm:p-7">
      <div>
        <h2 className="text-[1.4rem] font-bold">{g.label}</h2>
        <p className="text-muted mt-1 max-w-[50ch]">
          Mỗi bài hoàn thành ở bất kỳ lộ trình nào cũng tưới thêm XP cho cây.
        </p>
        <p className="mt-4 text-sm">
          {g.nextLabel ? (
            <>
              Còn <strong>{g.toNext} XP</strong> để đạt {g.nextLabel} · {g.pct}% toàn khoá
            </>
          ) : (
            <>Cây đã kết trái · {g.pct}% toàn khoá</>
          )}
        </p>
        <ol aria-label="Sáu giai đoạn phát triển của cây" className="mt-3 flex flex-wrap gap-1.5">
          {STAGES.map((s, i) => (
            <li
              key={s.label}
              aria-current={i === k ? "step" : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                i < k
                  ? "bg-merged-soft text-ink"
                  : i === k
                    ? "bg-amber text-on-amber"
                    : "bg-paper text-muted"
              }`}
            >
              {String(i + 1).padStart(2, "0")} {s.label}
            </li>
          ))}
        </ol>
      </div>
      <svg
        viewBox="0 0 120 140"
        className="mx-auto h-28 w-24 sm:h-36 sm:w-32"
        role="img"
        aria-label={`Cây tiến độ đang ở giai đoạn ${g.label}`}
      >
        <path d="M30 118h60l-8 20H38z" fill="var(--muted)" opacity="0.5" />
        <ellipse cx="60" cy="118" rx="32" ry="4" fill="var(--line)" />
        {k === 0 && <ellipse cx="60" cy="113" rx="6" ry="4" fill="var(--amber)" />}
        {k >= 1 && (
          <path
            d={`M60 118 V${k >= 2 ? 62 : 100}`}
            stroke="var(--ok)"
            strokeWidth={k >= 2 ? 6 : 3}
            strokeLinecap="round"
          />
        )}
        {k === 1 && (
          <>
            <ellipse
              cx="53"
              cy="98"
              rx="7"
              ry="3.5"
              fill="var(--ok)"
              transform="rotate(-25 53 98)"
            />
            <ellipse
              cx="67"
              cy="98"
              rx="7"
              ry="3.5"
              fill="var(--ok)"
              transform="rotate(25 67 98)"
            />
          </>
        )}
        {k >= 3 && (
          <path
            d="M60 86 L38 66 M60 78 L84 60 M60 70 L46 50"
            stroke="var(--ok)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {k >= 4 && (
          <g fill="var(--ok)" opacity="0.85">
            <circle cx="60" cy="44" r="22" />
            <circle cx="38" cy="60" r="14" />
            <circle cx="84" cy="56" r="15" />
          </g>
        )}
        {k >= 5 && (
          <g fill="var(--bad)">
            <circle cx="52" cy="40" r="4" />
            <circle cx="72" cy="48" r="4" />
            <circle cx="40" cy="62" r="4" />
            <circle cx="86" cy="58" r="4" />
          </g>
        )}
      </svg>
    </div>
  );
}
