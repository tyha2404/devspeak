"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOut } from "@/lib/client/auth";
import { useMe } from "@/stores/meStore";
import { toast } from "@/stores/toastStore";

const NAV = [
  { href: "/", label: "Trang chủ", active: (p: string) => p === "/" },
  {
    href: "/grammar",
    label: "Lộ trình",
    active: (p: string) =>
      p === "/grammar" || p === "/vocab" || p.startsWith("/lesson") || p.startsWith("/test-out"),
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6">
        <Link href="/" aria-label="Về trang chủ" className="mr-auto shrink-0 leading-none sm:mr-0">
          <span className="font-display text-ink block text-xl sm:text-[1.5rem]">
            DevQuest<span className="text-bad">.</span>
          </span>
          <span className="text-muted block text-[0.6rem] font-semibold tracking-[0.18em] uppercase">
            Ngữ pháp & Từ vựng
          </span>
        </Link>
        <nav
          aria-label="Điều hướng chính"
          className="order-last flex w-full justify-center gap-4 sm:order-none sm:mx-auto sm:w-auto sm:gap-6"
        >
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
        {me?.isGuest && (
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="bg-amber text-on-amber shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2"
          >
            Đăng nhập
          </Link>
        )}
        <details ref={menu} className="relative">
          <summary className="border-line flex cursor-pointer list-none items-center gap-2 rounded-full border p-1 sm:pr-3 [&::-webkit-details-marker]:hidden">
            <span className="bg-amber text-on-amber grid h-8 w-8 place-items-center rounded-full text-sm font-semibold">
              {name.trim().charAt(0).toLocaleUpperCase("vi")}
            </span>
            <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{name}</span>
            <ChevronDown size={14} aria-hidden className="text-muted hidden sm:block" />
          </summary>
          <div className="border-line bg-surface absolute right-0 mt-2 w-64 rounded-2xl border p-4 shadow-lg">
            <p className="text-muted text-xs font-semibold uppercase">Tài khoản người học</p>
            <p className="mt-1 font-semibold">{name}</p>
            {me?.email && <p className="text-muted truncate text-sm">{me.email}</p>}
            <p role="status" className={`mt-1 text-sm ${me?.isGuest ? "text-muted" : "text-ok"}`}>
              {!me
                ? "Chưa tải thông tin tài khoản"
                : me.isGuest
                  ? "Đang học với tư cách khách — tiến độ chỉ lưu trên thiết bị này"
                  : "Tiến độ đã đồng bộ"}
            </p>
            {me?.isGuest && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Link
                  href={`/login?next=${encodeURIComponent(pathname)}`}
                  className="bg-amber text-on-amber rounded-lg px-2 py-2 text-center font-semibold"
                >
                  Đăng nhập
                </Link>
                <Link
                  href={`/login?mode=signup&next=${encodeURIComponent(pathname)}`}
                  className="border-amber rounded-lg border px-2 py-2 text-center font-semibold"
                >
                  Đăng ký
                </Link>
              </div>
            )}
            <div className="mt-3 flex flex-col gap-1 text-sm">
              <Link href="/profile" className="hover:bg-paper rounded-lg px-2 py-1.5 font-medium">
                Trang cá nhân →
              </Link>
              <Link href="/review" className="hover:bg-paper rounded-lg px-2 py-1.5 font-medium">
                Ôn tập từ đã học →
              </Link>
              {me && !me.isGuest && (
                <button
                  onClick={() =>
                    void signOut().catch(() => toast("Không đăng xuất được. Hãy thử lại."))
                  }
                  className="hover:bg-paper text-bad rounded-lg px-2 py-1.5 text-left font-medium"
                >
                  Đăng xuất
                </button>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
