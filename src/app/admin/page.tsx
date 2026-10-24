import { llmIsFake } from "@/features/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { runGeneration, runPoll } from "./actions";

export default async function AdminHome() {
  const db = createAdminClient();
  const statuses = ["published", "in_review", "auto_checked", "draft", "rejected"] as const;
  const counts = await Promise.all(
    statuses.map(
      async (s) =>
        [
          s,
          (await db.from("questions").select("id", { count: "exact", head: true }).eq("status", s))
            .count ?? 0,
        ] as const,
    ),
  );
  const { data: jobs } = await db
    .from("generation_jobs")
    .select("id, kind, status, request_count, succeeded, errored, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  const { data: spend } = await db.rpc("svc_ai_spend_today");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan nội dung</h1>
      {llmIsFake() && (
        <p className="rounded bg-[#fff3c4] p-3 text-sm">
          Đang dùng <b>LLM giả lập</b> (chưa có ANTHROPIC_API_KEY hoặc LLM_FAKE=1). Nội dung sinh ra
          chỉ để thử luồng.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map(([s, n]) => (
          <div key={s} className="rounded bg-white p-3">
            <p className="text-xs text-[#5c5c7a]">{s}</p>
            <p className="text-2xl font-bold">{n}</p>
          </div>
        ))}
      </div>
      <p>
        Chi phí AI hôm nay: <b>${((Number(spend) || 0) / 1e6).toFixed(4)}</b>
      </p>
      <div className="flex gap-2">
        <form action={runGeneration}>
          <button className="rounded bg-[#1b1b28] px-4 py-2 text-sm text-white">
            Sinh nội dung ngay
          </button>
        </form>
        <form action={runPoll}>
          <button className="rounded border border-[#1b1b28] px-4 py-2 text-sm">
            Cập nhật batch
          </button>
        </form>
      </div>
      <h2 className="text-lg font-semibold">Batch gần đây</h2>
      <table className="w-full bg-white text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">Loại</th>
            <th>Trạng thái</th>
            <th>Yêu cầu</th>
            <th>OK / lỗi</th>
            <th>Tạo lúc</th>
          </tr>
        </thead>
        <tbody>
          {jobs?.map((j) => (
            <tr key={j.id} className="border-t">
              <td className="p-2">{j.kind}</td>
              <td>{j.status}</td>
              <td>{j.request_count}</td>
              <td>
                {j.succeeded} / {j.errored}
              </td>
              <td>{new Date(j.created_at).toLocaleString("vi-VN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
