import type { Metadata } from "next";
import Link from "next/link";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = { title: "Hồ sơ · DevQuest English", robots: { index: false } };

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hồ sơ của bạn</h1>
        <Link href="/play" className="text-sm underline">
          Về văn phòng
        </Link>
      </div>
      <ProfileClient />
    </main>
  );
}
