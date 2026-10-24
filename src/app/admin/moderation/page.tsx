import { createAdminClient } from "@/lib/supabase/admin";
import { editQuestion, reviewQuestion } from "../actions";

interface Row {
  id: string;
  slug: string;
  type: string;
  cefr: string;
  npc_id: string | null;
  status: string;
  origin: string;
  report_count: number;
  question_versions: {
    prompt: Record<string, unknown>;
    answer: Record<string, unknown>;
    explanation_vi: string | null;
    hint_vi: string | null;
    qa_report: {
      rubric?: { issues: string[]; distractor_quality: number } | null;
      solve?: unknown;
      validation?: { warnings: string[] };
    } | null;
  };
}

export default async function Moderation({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "in_review", q: search } = await searchParams;
  const { data } = await createAdminClient()
    .from("questions")
    .select(
      "id, slug, type, cefr, npc_id, status, origin, report_count, question_versions!questions_current_version_fk(prompt, answer, explanation_vi, hint_vi, qa_report)",
    )
    .eq("status", status)
    .ilike("slug", search ? `%${search.replace(/[%_]/g, "")}%` : "%")
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Duyệt câu hỏi</h1>
      <div className="flex gap-2 text-sm">
        {["in_review", "auto_checked", "draft", "rejected", "published"].map((s) => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`rounded px-3 py-1 ${s === status ? "bg-[#1b1b28] text-white" : "bg-white"}`}
          >
            {s}
          </a>
        ))}
      </div>
      {rows.length === 0 && <p>Không có câu nào.</p>}
      {rows.map((q) => {
        const v = q.question_versions;
        const qa = v.qa_report;
        return (
          <article key={q.id} className="space-y-2 rounded bg-white p-4">
            <p className="text-xs text-[#5c5c7a]">
              {q.slug} · {q.type} · {q.cefr} · {q.npc_id} · {q.origin}
              {q.report_count > 0 && (
                <b className="ml-2 text-[#c62828]">{q.report_count} báo cáo</b>
              )}
            </p>
            <pre className="overflow-x-auto rounded bg-[#f4f4f6] p-2 text-xs">
              {JSON.stringify(v.prompt, null, 2)}
            </pre>
            <p className="text-sm">
              <b>Đáp án:</b> <code>{JSON.stringify(v.answer)}</code>
            </p>
            <p className="text-sm">
              <b>Giải thích:</b> {v.explanation_vi}
            </p>
            {qa && (
              <p className="text-xs text-[#5c5c7a]">
                QA: blind solve {JSON.stringify(qa.solve)} · distractors{" "}
                {qa.rubric?.distractor_quality ?? "?"}/5
                {qa.rubric?.issues?.length ? ` · issues: ${qa.rubric.issues.join("; ")}` : ""}
                {qa.validation?.warnings?.length
                  ? ` · warnings: ${qa.validation.warnings.join(", ")}`
                  : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={reviewQuestion}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="decision" value="approve" />
                <button className="rounded bg-[#2e7d32] px-3 py-1 text-sm text-white">Duyệt</button>
              </form>
              <form action={reviewQuestion} className="flex gap-1">
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="decision" value="reject" />
                <input name="reason" placeholder="Lý do" className="rounded border px-2 text-sm" />
                <button className="rounded bg-[#c62828] px-3 py-1 text-sm text-white">Loại</button>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer text-sm">
                Sửa rồi duyệt (tạo phiên bản mới)
              </summary>
              <form action={editQuestion} className="mt-2 space-y-2">
                <input type="hidden" name="id" value={q.id} />
                <p className="text-xs">
                  Dán JSON theo định dạng câu hỏi tự viết (xem content/curated/questions/*.yaml).
                </p>
                <textarea
                  name="spec"
                  rows={8}
                  className="w-full rounded border p-2 font-mono text-xs"
                  required
                />
                <button className="rounded bg-[#1b1b28] px-3 py-1 text-sm text-white">
                  Lưu & duyệt
                </button>
              </form>
            </details>
          </article>
        );
      })}
    </div>
  );
}
