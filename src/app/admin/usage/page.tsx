import { createAdminClient } from "@/lib/supabase/admin";

export default async function Usage() {
  const { data } = await createAdminClient()
    .from("api_usage_daily")
    .select("*")
    .order("day", { ascending: false })
    .limit(60);
  const total = (data ?? []).reduce((n, r) => n + Number(r.cost_usd_micros ?? 0), 0);
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Chi phí Claude API</h1>
      <p>
        Tổng (60 dòng gần nhất): <b>${(total / 1e6).toFixed(4)}</b>. Đối soát hằng tuần với Usage
        &amp; Cost Admin API.
      </p>
      <table className="w-full bg-white text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">Ngày</th>
            <th>Tính năng</th>
            <th>Model</th>
            <th>Requests</th>
            <th>Input</th>
            <th>Cache read</th>
            <th>Output</th>
            <th>USD</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((r) => (
            <tr key={`${r.day}-${r.feature}-${r.model}`} className="border-t">
              <td className="p-2">{r.day}</td>
              <td>{r.feature}</td>
              <td>{r.model}</td>
              <td>{r.requests}</td>
              <td>{r.input_tokens}</td>
              <td>{r.cache_read_tokens}</td>
              <td>{r.output_tokens}</td>
              <td>${(Number(r.cost_usd_micros) / 1e6).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
