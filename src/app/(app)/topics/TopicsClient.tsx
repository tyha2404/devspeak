"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MistakeCards } from "@/components/learn/steps/MistakeCards";
import { api } from "@/lib/client/api";
import type { MistakeItem, PathStage, PathUnit } from "@/lib/contracts/learn";
import { createClient } from "@/lib/supabase/browser";

const GROUPS: { kind: MistakeItem["kind"][]; title: string; body: string }[] = [
  {
    kind: ["grammar", "word-choice", "register"],
    title: "Lỗi diễn đạt hay gặp",
    body: "Những câu dịch thẳng từ tiếng Việt nghe lạ với đồng nghiệp nước ngoài.",
  },
  {
    kind: ["pronunciation"],
    title: "Phát âm thuật ngữ IT",
    body: "cache, queue, SQL, nginx… đọc sao cho người khác hiểu.",
  },
  {
    kind: ["symbol"],
    title: "Đọc ký hiệu & con số",
    body: "Khi đọc code, đường dẫn, phiên bản và đơn vị thành tiếng.",
  },
];

/** Technical English: the knowledge units of the path plus the common-mistakes library. */
export function TopicsClient() {
  const [units, setUnits] = useState<PathUnit[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);

  useEffect(() => {
    api
      .get<{ stages: PathStage[] }>("/api/path")
      .then((p) =>
        setUnits(p.stages.flatMap((s) => s.units).filter((u) => u.kind === "knowledge")),
      );
    void createClient()
      .from("mistakes")
      .select("slug, kind, wrong, right, say, explanation_vi")
      .then(({ data }) =>
        setMistakes(
          (data ?? []).map((m) => ({
            slug: m.slug,
            kind: m.kind,
            wrong: m.wrong,
            right: m.right,
            say: m.say,
            explanation: m.explanation_vi,
          })),
        ),
      );
  }, []);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-[1.75rem] font-bold">Kiến thức dev bằng tiếng Anh</h1>
        <p className="text-muted mt-1 max-w-[60ch]">
          Đọc tài liệu, nghe tech talk và giải thích khái niệm kỹ thuật bằng tiếng Anh. Các chuyên
          đề này nằm xen trong lộ trình.
        </p>
      </header>

      <section aria-labelledby="k-units">
        <h2 id="k-units" className="text-xl font-bold">
          Chuyên đề
        </h2>
        <ul className="divide-line border-line bg-surface mt-4 divide-y rounded-xl border">
          {units.map((u) => {
            const open = u.state !== "locked" && u.state !== "coming_soon";
            const row = (
              <div className="flex items-baseline gap-3 px-4 py-3">
                <span className="text-muted w-8 flex-none font-mono text-sm">{u.code}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-medium ${open ? "" : "text-muted"}`}>
                    {u.title.vi}
                  </span>
                  <span className="text-muted text-sm">{u.summary}</span>
                </span>
                <span className="text-muted text-sm">
                  {u.state === "coming_soon"
                    ? "Sắp ra mắt"
                    : u.state === "locked"
                      ? "Chưa mở"
                      : u.state === "completed"
                        ? "Đã xong"
                        : "Đang mở"}
                </span>
              </div>
            );
            return (
              <li key={u.id}>
                {open ? (
                  <Link href={`/path/${u.slug}`} className="hover:bg-paper block">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {GROUPS.map((g) => {
        const items = mistakes.filter((m) => g.kind.includes(m.kind));
        if (!items.length) return null;
        return (
          <section key={g.title} aria-label={g.title}>
            <h2 className="text-xl font-bold">{g.title}</h2>
            <p className="text-muted mt-1 mb-4">{g.body}</p>
            <MistakeCards items={items} />
          </section>
        );
      })}
    </div>
  );
}
