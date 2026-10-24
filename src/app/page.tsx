import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { btn } from "@/components/app/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { createClient } from "@/lib/supabase/server";

interface Stage {
  id: number;
  sort: number;
  cefr: string;
  title_en: string;
  title_vi: string;
  tagline_vi: string;
}
interface Unit {
  stage_id: number;
  sort: number;
  code: string;
  title_en: string;
  title_vi: string;
  status: string;
}

export default async function Home() {
  const t = await getTranslations("landing");
  const vi = (await getLocale()) === "vi";
  const db = await createClient();
  const [{ data: stages }, { data: units }] = await Promise.all([
    db.from("stages").select("id, sort, cefr, title_en, title_vi, tagline_vi").order("sort"),
    db.from("units").select("stage_id, sort, code, title_en, title_vi, status").order("sort"),
  ]);
  const path = ((stages ?? []) as Stage[]).map((s) => ({
    ...s,
    units: ((units ?? []) as Unit[]).filter((u) => u.stage_id === s.id),
  }));
  const first = path[0]?.units.slice(0, 6) ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "DevQuest English",
    description: t("subtitle"),
    inLanguage: ["en", "vi"],
    educationalLevel: "CEFR A2–B2",
    provider: { "@type": "EducationalOrganization", name: "DevQuest English" },
    isAccessibleForFree: true,
  };

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="flex items-center justify-between py-5">
        <p className="flex items-center gap-2 font-bold">
          <span
            className="bg-ink text-paper grid h-8 w-8 place-items-center rounded-lg font-mono text-sm"
            aria-hidden
          >
            dq
          </span>
          DevQuest English
        </p>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link href="/login" className="text-sm font-medium underline">
            {t("login")}
          </Link>
        </div>
      </header>

      <section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
        <div>
          <h1 className="text-[2.25rem] leading-[1.15] font-bold sm:text-[2.75rem]">
            {t("title")}
          </h1>
          <p className="text-muted mt-5 max-w-[56ch] text-lg">{t("subtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/learn" className={btn.primary}>
              {t("start")}
            </Link>
            <a href="#path" className={btn.secondary}>
              {t("seePath")}
            </a>
          </div>
          <p className="text-muted mt-3 text-sm">{t("free")}</p>
        </div>

        {/* The path as a git log: what you'll actually work through in the first stage. */}
        <div
          className="border-line overflow-hidden rounded-2xl border bg-[#141a26] text-[#d6dbe6] shadow-xl"
          aria-hidden
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 font-mono text-xs text-[#8c95a8]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5534b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e0a43a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#4bb37a]" />
            <span className="ml-2">git log --graph --oneline path/a2-foundation</span>
          </div>
          <ol className="px-5 py-4 font-mono text-[0.82rem] leading-7">
            {first.map((u, i) => (
              <li key={u.code} className="flex gap-3 whitespace-nowrap">
                <span
                  className={
                    i < 2 ? "text-[#a996f5]" : i === 2 ? "text-[#f0a045]" : "text-[#5d6880]"
                  }
                >
                  {i < 2 ? "●" : i === 2 ? "◉" : "○"}
                </span>
                <span className="text-[#8c95a8]">{u.code.padEnd(3, " ")}</span>
                <span className={`truncate ${i > 2 ? "text-[#8c95a8]" : ""}`}>
                  {vi ? u.title_vi : u.title_en}
                </span>
              </li>
            ))}
            <li className="flex gap-3">
              <span className="text-[#5d6880]">│</span>
              <span className="text-[#5d6880]">…</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#5d6880]">◆</span>
              <span className="rounded bg-[#d6dbe6] px-1.5 text-[#141a26]">tag: v1.0</span>
              <span className="text-[#8c95a8]">checkpoint · A2</span>
            </li>
          </ol>
        </div>
      </section>

      <section id="path" className="border-line border-t py-14">
        <h2 className="text-[1.75rem] font-bold">{t("pathTitle")}</h2>
        <p className="text-muted mt-2 max-w-[60ch]">{t("pathBody")}</p>
        <ol className="mt-8 grid gap-8 md:grid-cols-2">
          {path.map((s) => (
            <li key={s.id}>
              <p className="text-muted font-mono text-sm">
                v{s.sort}.0 · {s.cefr}
              </p>
              <h3 className="mt-1 text-xl font-bold">{vi ? s.title_vi : s.title_en}</h3>
              {vi && <p className="text-muted">{s.tagline_vi}</p>}
              <ul className="mt-3 space-y-1">
                {s.units.map((u) => (
                  <li key={u.code} className="flex gap-3">
                    <span className="text-muted w-8 flex-none font-mono text-sm leading-6">
                      {u.code}
                    </span>
                    <span className={u.status === "published" ? "" : "text-muted"}>
                      {vi ? u.title_vi : u.title_en}
                      {u.status !== "published" && (
                        <span className="ml-2 text-sm">({t("comingSoon")})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-line border-t py-14">
        <h2 className="text-[1.75rem] font-bold">{t("how.title")}</h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {(["words", "talk", "task", "review"] as const).map((k) => (
            <div key={k}>
              <dt className="font-semibold">{t(`how.${k}.title`)}</dt>
              <dd className="text-muted mt-1">{t(`how.${k}.body`)}</dd>
            </div>
          ))}
        </dl>
        <Link href="/learn" className={`${btn.primary} mt-10`}>
          {t("start")}
        </Link>
      </section>

      <footer className="border-line text-muted flex flex-wrap gap-5 border-t py-8 text-sm">
        <Link href="/credits">{t("footer.credits")}</Link>
        <Link href="/privacy">{t("footer.privacy")}</Link>
        <Link href="/terms">{t("footer.terms")}</Link>
      </footer>
    </main>
  );
}
