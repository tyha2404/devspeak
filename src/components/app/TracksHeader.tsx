"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMe } from "@/stores/meStore";

const NAV = [
  { href: "/", label: "Trang chủ", active: (p: string) => p === "/" },
  {
    href: "/grammar",
    label: "Lộ trình",
    active: (p: string) =>
      p === "/grammar" || p === "/vocab" || p.startsWith("/lesson") || p.startsWith("/exam"),
  },
];

/** Top bar of the grammar & vocabulary area: brand, Trang chủ / Lộ trình, and the account menu. */
export function TracksHeader() {
  const pathname = usePathname();
  const me = useMe((s) => s.home?.me);
  const menu = useRef<HTMLDetailsElement>(null);

  // Close the account menu on outside clicks and Escape.
  useEffect(() => {
    const close = (e: Event) => {
      if (menu.current && !menu.current.contains(e.target as Node)) menu.current.open = false;
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menu.current) menu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const name = me?.displayName ?? (me?.isGuest ? "Khách" : "Tài khoản");
  return (
    <header className="border-line bg-surface sticky top-0 z-20 border-b">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Về trang chủ" className="leading-none">
          <span className="font-display text-ink block text-[1.5rem]">
            DevQuest<span className="text-bad">.</span>
          </span>
          <span className="text-muted block text-[0.6rem] font-semibold tracking-[0.18em] uppercase">
            Ngữ pháp & Từ vựng
          </span>
        </Link>
        <nav aria-label="Điều hướng chính" className="mx-auto flex gap-1 sm:gap-6">
          {NAV.map((n) => {
            const on = n.active(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`border-b-[3px] px-2 py-2 text-sm font-semibold sm:text-base ${
                  on ? "border-merged text-ink" : "text-muted hover:text-ink border-transparent"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <details ref={menu} className="relative">
          <summary className="border-line flex cursor-pointer list-none items-center gap-2 rounded-full border py-1 pr-3 pl-1 [&::-webkit-details-marker]:hidden">
            <span className="bg-amber text-on-amber grid h-8 w-8 place-items-center rounded-full text-sm font-semibold">
              {name.trim().charAt(0).toLocaleUpperCase("vi")}
            </span>
            <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{name}</span>
            <ChevronDown size={14} aria-hidden className="text-muted" />
          </summary>
          <div className="border-line bg-surface absolute right-0 mt-2 w-64 rounded-2xl border p-4 shadow-lg">
            <p className="text-muted text-xs font-semibold uppercase">Tài khoản người học</p>
            <p className="mt-1 font-semibold">{name}</p>
            <p role="status" className="text-ok mt-1 text-sm">
              {me?.isGuest ? "Đang học với tư cách khách" : "Tiến độ đã đồng bộ"}
            </p>
            <div className="mt-3 flex flex-col gap-1 text-sm">
              <Link href="/profile" className="hover:bg-paper rounded-lg px-2 py-1.5 font-medium">
                Trang cá nhân →
              </Link>
              <Link href="/review" className="hover:bg-paper rounded-lg px-2 py-1.5 font-medium">
                Ôn tập từ đã học →
              </Link>
              <Link href="/career" className="hover:bg-paper rounded-lg px-2 py-1.5 font-medium">
                Lộ trình tiếng Anh công việc →
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
