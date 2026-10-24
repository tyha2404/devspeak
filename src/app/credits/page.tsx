import type { Metadata } from "next";
import { TILESETS } from "@/game/data/tilesets";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Credits · DevQuest English" };

// Every third-party asset or dataset must be listed here with its license.
const ART = [
  ...TILESETS.map((t) => ({
    name: t.license.split(",")[0]!,
    license: t.license.split(", ")[1] ?? "",
    url: t.source ? "https://kenney.nl" : null,
  })),
  { name: "DevQuest characters", license: "CC0 1.0", url: null },
  {
    name: "Be Vietnam Pro (font)",
    license: "SIL Open Font License 1.1",
    url: "https://fonts.google.com/specimen/Be+Vietnam+Pro",
  },
];

export default async function CreditsPage() {
  const { data: sources } = await (
    await createClient()
  )
    .from("sources")
    .select("slug, name, url, license_spdx, license_url, attribution_text")
    .order("id");
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Credits</h1>
      <p className="mt-2 text-[#c9c6b5]">
        Cảm ơn các tác giả nội dung mở đã giúp DevQuest English ra đời.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Dữ liệu từ vựng &amp; câu ví dụ</h2>
      <ul className="mt-3 space-y-3">
        {(sources ?? []).map((s) => (
          <li key={s.slug} className="border-b border-white/10 pb-2">
            <p className="flex justify-between gap-4">
              {s.url ? (
                <a className="underline" href={s.url}>
                  {s.name}
                </a>
              ) : (
                <span>{s.name}</span>
              )}
              {s.license_url ? (
                <a className="text-[#c9c6b5] underline" href={s.license_url}>
                  {s.license_spdx}
                </a>
              ) : (
                <span className="text-[#c9c6b5]">{s.license_spdx}</span>
              )}
            </p>
            <p className="text-sm text-[#c9c6b5]">{s.attribution_text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-[#c9c6b5]">
        Danh sách từ vựng dẫn xuất từ nguồn CC BY-SA được chia sẻ theo giấy phép CC BY-SA 4.0.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Đồ họa &amp; font</h2>
      <ul className="mt-3 space-y-2">
        {ART.map((a) => (
          <li key={a.name} className="flex justify-between gap-4 border-b border-white/10 pb-2">
            {a.url ? (
              <a className="underline" href={a.url}>
                {a.name}
              </a>
            ) : (
              <span>{a.name}</span>
            )}
            <span className="text-[#c9c6b5]">{a.license}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
