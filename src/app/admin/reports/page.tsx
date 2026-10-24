import { createAdminClient } from "@/lib/supabase/admin";
import { resolveReport } from "../actions";

export default async function Reports() {
  const { data } = await createAdminClient()
    .from("question_reports")
    .select("id, reason, note, created_at, questions(slug, status)")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Báo cáo từ người học</h1>
      {!data?.length && <p>Không có báo cáo mở.</p>}
      {data?.map((r) => {
        const q = r.questions as unknown as { slug: string; status: string };
        return (
          <div
            key={r.id}
            className="flex items-center justify-between rounded bg-white p-3 text-sm"
          >
            <span>
              <b>{q.slug}</b> ({q.status}) · {r.reason} {r.note && `· ${r.note}`}
            </span>
            <form action={resolveReport}>
              <input type="hidden" name="id" value={r.id} />
              <button className="rounded bg-[#1b1b28] px-3 py-1 text-white">Đã xử lý</button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
