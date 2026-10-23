import type { Metadata } from "next";
import { TILESETS } from "@/game/data/tilesets";

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

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Credits</h1>
      <p className="mt-2 text-[#c9c6b5]">
        Cảm ơn các tác giả nội dung mở đã giúp DevQuest English ra đời.
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
