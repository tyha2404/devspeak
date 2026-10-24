import Link from "next/link";
import type { ReactNode } from "react";
import { requireEditor } from "@/features/admin/auth";

export const metadata = { title: "Admin · DevQuest English", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireEditor();
  return (
    <div className="min-h-dvh bg-[#f4f1de] text-[#1b1b28]">
      <nav className="flex flex-wrap gap-4 border-b border-[#d6d3c4] bg-white px-4 py-3 text-sm font-semibold">
        <Link href="/admin">Tổng quan</Link>
        <Link href="/admin/moderation">Duyệt câu hỏi</Link>
        <Link href="/admin/reports">Báo cáo lỗi</Link>
        <Link href="/admin/senses">Duyệt nghĩa VN</Link>
        <Link href="/admin/usage">Chi phí AI</Link>
        <Link href="/play" className="ml-auto">
          ← Vào game
        </Link>
      </nav>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
