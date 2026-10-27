import { useId } from "react";

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
  const id = useId();
  const g = growthStage(xp, max);
  const k = g.index;
  return (
    <div className="border-line bg-surface grid min-w-0 grid-cols-1 gap-4 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-6 sm:p-7">
      <div className="order-2 min-w-0 sm:order-1">
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
        viewBox="0 0 200 210"
        className="order-1 mx-auto h-40 w-40 max-w-full self-center sm:order-2 sm:h-auto sm:w-full"
        role="img"
        aria-label={`Cây tiến độ đang ở giai đoạn ${g.label}`}
      >
        <defs>
          <linearGradient id={`${id}-pot`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#16877a" />
            <stop offset="1" stopColor="#064b47" />
          </linearGradient>
          <linearGradient id={`${id}-seed`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#ffe3a0" />
            <stop offset="0.5" stopColor="#dba65d" />
            <stop offset="1" stopColor="#9a643c" />
          </linearGradient>
          <linearGradient id={`${id}-leaf`} x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#0f978d" />
            <stop offset="1" stopColor="#6cdec0" />
          </linearGradient>
          <linearGradient id={`${id}-bark`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#795a3d" />
            <stop offset="0.5" stopColor="#b68c5e" />
            <stop offset="1" stopColor="#795a3d" />
          </linearGradient>
          <radialGradient id={`${id}-fruit`} cx="0.3" cy="0.25" r="0.8">
            <stop stopColor="#ffe8a0" />
            <stop offset="0.6" stopColor="#ffcf55" />
            <stop offset="1" stopColor="#e5a132" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="98" r="80" fill="var(--amber-soft)" />
        <circle cx="151" cy="42" r="17" fill="var(--gold)" opacity="0.25" />
        <path
          d="M41 66v8m-4-4h8M158 100v6m-3-3h6"
          stroke="var(--merged)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <ellipse cx="100" cy="192" rx="49" ry="7" fill="var(--ink)" opacity="0.08" />
        <path d="M52 140l11 39c4 17 70 17 74 0l11-39z" fill={`url(#${id}-pot)`} />
        <path
          d="M66 153l6 22c2 5 12 8 21 8"
          fill="none"
          stroke="#83e5ce"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <ellipse cx="100" cy="140" rx="48" ry="15" fill="#16877a" />
        <ellipse cx="100" cy="138" rx="41" ry="10" fill="#654936" />
        <path
          d="M67 139c17-6 45-6 65-1"
          fill="none"
          stroke="#9a7652"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g fill="#c59b6c" opacity="0.65">
          <ellipse cx="76" cy="138" rx="2" ry="1" />
          <ellipse cx="122" cy="141" rx="3" ry="1.5" />
          <ellipse cx="114" cy="134" rx="1.5" ry="1" />
        </g>
        {k === 0 && (
          <g>
            <ellipse cx="102" cy="139" rx="18" ry="4" fill="#38291f" opacity="0.25" />
            <path
              d="M87 130c-10-16-3-32 12-38 16 7 26 20 17 35-7 13-21 16-29 3z"
              fill={`url(#${id}-seed)`}
            />
            <path
              d="M99 97c-7 11-5 24 3 35"
              fill="none"
              stroke="#8a5a35"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M105 100c6 5 10 11 10 17"
              fill="none"
              stroke="#fff1cb"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
        )}
        {k === 1 && (
          <g>
            <path
              d="M100 139q-5-16 0-29"
              fill="none"
              stroke="#118e77"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <GrowthLeaf x={99} y={119} angle={-35} scale={0.65} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={100} y={111} angle={75} scale={0.7} fill={`url(#${id}-leaf)`} />
            <path
              d="M90 139l-6-7 9-3m15 10 7-8-8-3"
              fill={`url(#${id}-seed)`}
              stroke="#c39052"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
        )}
        {k === 2 && (
          <g>
            <path
              d="M101 139q-8-30 0-66"
              fill="none"
              stroke="#118e77"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <GrowthLeaf x={99} y={122} angle={-37} scale={0.8} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={99} y={108} angle={78} scale={0.85} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={100} y={87} angle={-20} scale={0.75} fill={`url(#${id}-leaf)`} />
            <path d="M101 75q-5-12 3-18 9 10-3 18z" fill="#6cdec0" />
            <path
              d="M97 135l-5 5m10-5 7 5"
              stroke="#118e77"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        )}
        {k >= 3 && (
          <g>
            <path d="M94 141q7-38 3-81h7q-1 45 8 81z" fill={`url(#${id}-bark)`} />
            <path
              d="M100 112Q82 101 65 83m37 16q14-4 31-25m-32 9Q88 70 82 55m20 15 12-23"
              fill="none"
              stroke="#9b7751"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M101 130q0-15-2-25"
              fill="none"
              stroke="#e6bc83"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.6"
            />
            <path
              d="M96 135l-7 6m18-6 9 6"
              stroke="#9b7751"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}
        {k === 3 && (
          <g fill="#6cdec0" stroke="#118e77" strokeWidth="1">
            <path d="M65 84q-11-3-8-12 10 0 8 12z" />
            <path d="M133 75q-1-11 9-12 4 10-9 12z" />
            <path d="M82 56q-10-5-6-13 10 2 6 13z" />
            <path d="M114 48q-1-11 8-13 5 10-8 13z" />
            <path d="M100 61q-7-10 1-16 9 8-1 16z" />
          </g>
        )}
        {k >= 4 && (
          <g>
            <GrowthLeaf x={67} y={86} angle={-30} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={78} y={99} angle={-75} scale={0.85} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={83} y={58} angle={-10} scale={0.9} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={102} y={63} angle={35} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={114} y={49} angle={75} scale={0.85} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={131} y={77} angle={80} fill={`url(#${id}-leaf)`} />
            <GrowthLeaf x={119} y={96} angle={115} scale={0.85} fill={`url(#${id}-leaf)`} />
          </g>
        )}
        {k === 5 && (
          <g>
            <GrowthFruit x={71} y={93} fill={`url(#${id}-fruit)`} />
            <GrowthFruit x={111} y={67} fill={`url(#${id}-fruit)`} />
            <GrowthFruit x={137} y={98} fill={`url(#${id}-fruit)`} />
          </g>
        )}
      </svg>
    </div>
  );
}

function GrowthLeaf({
  x,
  y,
  angle = 0,
  scale = 1,
  fill,
}: {
  x: number;
  y: number;
  angle?: number;
  scale?: number;
  fill: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path d="M0 0C-18-4-25-24-20-37-2-39 12-18 0 0z" fill={fill} />
      <path
        d="M0-2q-13-14-18-31"
        fill="none"
        stroke="#d2f5df"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
    </g>
  );
}

function GrowthFruit({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0-9q-2-6 2-9" fill="none" stroke="#795a3d" strokeWidth="2" strokeLinecap="round" />
      <path d="M1-12q3-8 10-5-1 8-10 5z" fill="#16877a" />
      <circle r="10" fill={fill} />
      <path
        d="M-6-1q0-4 4-5"
        fill="none"
        stroke="#fff4cb"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </g>
  );
}
