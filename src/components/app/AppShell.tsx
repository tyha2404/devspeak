"use client";

import { BookOpenText, Flame, GitBranch, MessagesSquare, RotateCcw, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useMe } from "@/stores/meStore";
import { Toasts } from "./Toasts";

const NAV = [
  { href: "/learn", label: "Học", icon: GitBranch, match: ["/learn", "/path"] },
  { href: "/review", label: "Ôn tập", icon: RotateCcw, match: ["/review", "/words"] },
  { href: "/practice", label: "Tình huống", icon: MessagesSquare, match: ["/practice"] },
  { href: "/topics", label: "Kiến thức", icon: BookOpenText, match: ["/topics"] },
  { href: "/profile", label: "Hồ sơ", icon: UserRound, match: ["/profile", "/settings"] },
];

/** Progress towards today's goal as a small ring. */
export function GoalRing({
  value,
  goal,
  size = 36,
}: {
  value: number;
  goal: number;
  size?: number;
}) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(1, goal));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${value}/${goal} XP hôm nay`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={pct >= 1 ? "var(--ok)" : "var(--amber)"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function DayStatus() {
  const me = useMe((s) => s.home?.me);
  if (!me) return null;
  return (
    <div className="flex items-center gap-3">
      <GoalRing value={me.todayXp} goal={me.dailyGoal} />
      <div className="text-sm leading-tight">
        <p className="font-semibold">
          {me.todayXp}/{me.dailyGoal} XP
        </p>
        <p className="text-muted flex items-center gap-1">
          <Flame size={14} className={me.streak > 0 ? "text-amber" : ""} aria-hidden />
          {me.streak} ngày liên tiếp
        </p>
      </div>
    </div>
  );
}

/** Sidebar on desktop, bottom tab bar on phones. Loads the learner and sends newcomers to onboarding. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const home = useMe((s) => s.home);
  const load = useMe((s) => s.load);

  useEffect(() => {
    void load().then((h) => {
      if (h && !h.me.onboarded) router.replace("/onboarding");
    });
  }, [load, router]);

  const active = (match: string[]) =>
    match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-line bg-surface hidden border-r md:block">
        <div className="sticky top-0 flex h-dvh flex-col px-4 py-6">
          <Link href="/learn" className="mb-8 flex items-center gap-2 px-2 text-lg font-bold">
            <span
              className="bg-ink text-paper grid h-8 w-8 place-items-center rounded-lg font-mono text-sm"
              aria-hidden
            >
              dq
            </span>
            DevQuest
          </Link>
          <nav aria-label="Chính" className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon, match }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(match) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium ${
                  active(match)
                    ? "bg-amber-soft text-ink"
                    : "text-muted hover:bg-paper hover:text-ink"
                }`}
              >
                <Icon size={20} aria-hidden className={active(match) ? "text-amber" : ""} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-line mt-auto border-t px-2 pt-5">
            <DayStatus />
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="border-line bg-surface flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Link href="/learn" className="flex items-center gap-2 font-bold">
            <span
              className="bg-ink text-paper grid h-7 w-7 place-items-center rounded-md font-mono text-xs"
              aria-hidden
            >
              dq
            </span>
            DevQuest
          </Link>
          <DayStatus />
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
          {home || pathname === "/onboarding" ? children : <p className="text-muted">Đang tải…</p>}
        </main>
      </div>

      <nav
        aria-label="Chính"
        className="border-line bg-surface fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon, match }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(match) ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium ${
              active(match) ? "text-ink" : "text-muted"
            }`}
          >
            <Icon size={22} aria-hidden className={active(match) ? "text-amber" : ""} />
            {label}
          </Link>
        ))}
      </nav>
      <Toasts />
    </div>
  );
}
