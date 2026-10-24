import type { Metadata } from "next";
import Link from "next/link";
import { ReviewClient } from "./ReviewClient";

export const metadata: Metadata = { title: "Ôn tập · DevQuest English", robots: { index: false } };

export default function ReviewPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔁 Ôn tập sổ tay</h1>
        <Link href="/play" className="text-sm underline">
          Về văn phòng
        </Link>
      </div>
      <ReviewClient />
    </main>
  );
}
