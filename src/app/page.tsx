import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const FEATURES = ["npc", "daily", "srs", "career"] as const;

export default async function Home() {
  const t = await getTranslations("landing");
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
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-12 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="flex items-center justify-between">
        <p className="text-sm tracking-widest text-[#f2a65a] uppercase">{t("kicker")}</p>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link href="/login" className="text-sm underline">
            {t("login")}
          </Link>
        </div>
      </header>
      <section className="flex flex-col gap-6">
        <h1 className="text-4xl leading-tight font-bold sm:text-5xl">{t("title")}</h1>
        <p className="text-lg text-[#c9c6b5]">{t("subtitle")}</p>
        <div>
          <Link
            href="/play"
            className="inline-block rounded bg-[#f2a65a] px-6 py-3 font-semibold text-[#1b1b28] hover:bg-[#f5b97a]"
          >
            {t("play")}
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <article key={f} className="rounded-lg bg-white/5 p-5">
            <h2 className="mb-1 font-semibold text-[#f2a65a]">{t(`features.${f}.title`)}</h2>
            <p className="text-[#c9c6b5]">{t(`features.${f}.body`)}</p>
          </article>
        ))}
      </section>
      <footer className="mt-auto flex flex-wrap gap-4 text-sm text-[#c9c6b5]">
        <Link href="/credits">{t("footer.credits")}</Link>
        <Link href="/privacy">{t("footer.privacy")}</Link>
        <Link href="/terms">{t("footer.terms")}</Link>
      </footer>
    </main>
  );
}
