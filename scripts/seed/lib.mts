import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const RAW = path.join(ROOT, "content/raw");

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

export const must = <T,>(
  r: { data: T | null; error: { message: string } | null },
  what: string,
): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
};

export interface SourceDef {
  slug: string;
  name: string;
  url: string;
  license_spdx: string;
  license_url: string;
  attribution_text: string;
  share_alike: boolean;
  commercial_ok: boolean;
  files: { url: string; file: string; bunzip?: boolean }[];
}

// Every dataset we import, with its license (verified 2026-10-24; see the plan's data-source table).
export const SOURCES: SourceDef[] = [
  {
    slug: "ngsl-1.2",
    name: "New General Service List 1.2",
    url: "https://www.newgeneralservicelist.com/new-general-service-list",
    license_spdx: "CC-BY-SA-4.0",
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution_text:
      "Browne, C., Culligan, B. & Phillips, J. (2013). The New General Service List. CC BY-SA 4.0.",
    share_alike: true,
    commercial_ok: true,
    files: [
      {
        url: "https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv",
        file: "ngsl/NGSL_12_stats.csv",
      },
    ],
  },
  {
    slug: "cefrj-1.5",
    name: "CEFR-J Vocabulary Profile 1.5",
    url: "https://github.com/openlanguageprofiles/olp-en-cefrj",
    license_spdx: "LicenseRef-CEFRJ",
    license_url: "https://github.com/openlanguageprofiles/olp-en-cefrj",
    attribution_text:
      "The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Free for research and commercial use with citation.",
    share_alike: false,
    commercial_ok: true,
    files: [
      {
        url: "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv",
        file: "cefrj/cefrj-vocabulary-profile-1.5.csv",
      },
    ],
  },
  {
    slug: "tatoeba",
    name: "Tatoeba sentences (English–Vietnamese)",
    url: "https://tatoeba.org/en/downloads",
    license_spdx: "CC-BY-2.0-FR",
    license_url: "https://creativecommons.org/licenses/by/2.0/fr/",
    attribution_text: "Example sentences from Tatoeba (tatoeba.org), CC BY 2.0 FR.",
    share_alike: false,
    commercial_ok: true,
    files: [
      {
        url: "https://downloads.tatoeba.org/exports/per_language/vie/vie_sentences.tsv.bz2",
        file: "tatoeba/vie_sentences.tsv",
        bunzip: true,
      },
      {
        url: "https://downloads.tatoeba.org/exports/per_language/vie/vie-eng_links.tsv.bz2",
        file: "tatoeba/vie-eng_links.tsv",
        bunzip: true,
      },
      {
        url: "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2",
        file: "tatoeba/eng_sentences.tsv",
        bunzip: true,
      },
    ],
  },
  {
    slug: "wiktionary-vi",
    name: "Vietnamese Wiktionary via Kaikki/wiktextract",
    url: "https://kaikki.org/dictionary/rawdata.html",
    license_spdx: "CC-BY-SA-4.0",
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution_text:
      "Vietnamese glosses from Wiktionary contributors (via kaikki.org), CC BY-SA 4.0.",
    share_alike: true,
    commercial_ok: true,
    files: [], // 273 MB; downloaded only with `pnpm seed:kaikki <path-to-vi-extract.jsonl>`
  },
];

export async function upsertSources() {
  const client = db();
  const ids: Record<string, number> = {};
  for (const s of SOURCES) {
    const { files, ...row } = s;
    void files;
    const r = must(
      await client.from("sources").upsert(row, { onConflict: "slug" }).select("id").single(),
      s.slug,
    ) as { id: number };
    ids[s.slug] = r.id;
  }
  return ids;
}

export function sha256(file: string) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export async function chunks<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}
