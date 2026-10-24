import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { btn } from "@/components/app/ui";
import { createClient } from "@/lib/supabase/server";

interface Cert {
  id: string;
  display_name: string;
  stage_slug: string;
  stage_sort: number;
  stage_title_en: string;
  stage_title_vi: string;
  cefr: string;
  score_pct: number;
  issued_at: string;
}

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await (await createClient()).rpc("get_certificate", { p_id: id });
  return ((data ?? []) as Cert[])[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const c = await load((await params).id);
  return c
    ? { title: `${c.display_name} · ${c.stage_title_en} (${c.cefr}) · DevQuest English` }
    : { title: "Chứng nhận · DevQuest English" };
}

/** Public, shareable certificate for passing a stage checkpoint. */
export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const c = await load((await params).id);
  if (!c) notFound();
  const date = new Date(c.issued_at).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article className="border-line bg-surface rounded-3xl border p-8 sm:p-12">
        <p className="text-muted font-mono text-sm">DevQuest English · release v{c.stage_sort}.0</p>
        <h1 className="mt-8 text-[2.25rem] leading-tight font-bold sm:text-[2.75rem]">
          {c.display_name}
        </h1>
        <p className="mt-4 text-lg">
          đã hoàn thành chặng <b>{c.stage_title_vi}</b> ({c.stage_title_en}) trong lộ trình tiếng
          Anh cho lập trình viên, trình độ <b>{c.cefr}</b>.
        </p>
        <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <dt className="text-muted text-sm">Điểm checkpoint</dt>
            <dd className="text-xl font-bold">{c.score_pct}%</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">Ngày cấp</dt>
            <dd className="text-xl font-bold">{date}</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">Mã chứng nhận</dt>
            <dd className="font-mono text-sm leading-7">{c.id.slice(0, 8)}</dd>
          </div>
        </dl>
      </article>
      <Link href="/" className={`${btn.secondary} mt-6`}>
        Tìm hiểu DevQuest English
      </Link>
    </main>
  );
}
