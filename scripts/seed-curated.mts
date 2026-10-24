/**
 * Upserts hand-written content (content/curated/**) into Postgres. Idempotent:
 *   - senses/examples upsert by slug
 *   - a question gets a new version only when its content hash changes
 *   - a dialogue's version bumps only when its graph changes
 *
 * Usage: pnpm seed:curated   (reads .env.local for the service-role key)
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { toQuestionRow } from "../src/features/content/toQuestionRow";
import { loadCurated, validateCurated } from "./lib/curated";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false } });

const must = <T,>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
};

const curated = loadCurated();
const errors = validateCurated(curated);
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

// ----- source -----
const source = must(
  await db
    .from("sources")
    .upsert(
      {
        slug: "devquest-original",
        name: "DevQuest English original content",
        license_spdx: "proprietary-own",
        attribution_text: "Written by the DevQuest English team.",
        share_alike: false,
        commercial_ok: true,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single(),
  "source",
) as { id: number };

// ----- vocabulary -----
const senseIds = new Map<string, number>();
for (const s of curated.senses) {
  const normalized = s.lemma.toLowerCase();
  const lexeme = must(
    await db
      .from("lexemes")
      .upsert(
        {
          display: s.lemma,
          normalized,
          pos: s.pos,
          kind: s.kind,
          cefr: s.cefr,
          cefr_source: "curated",
          cefr_confidence: "high",
          is_it_term: s.it,
          ipa: s.ipa ?? null,
          source_id: source.id,
        },
        { onConflict: "normalized,pos" },
      )
      .select("id")
      .single(),
    `lexeme ${s.slug}`,
  ) as { id: number };

  const forms = [...new Set([normalized, ...s.forms.map((f) => f.toLowerCase())])];
  must(
    await db.from("word_forms").upsert(
      forms.map((form) => ({
        form,
        lexeme_id: lexeme.id,
        kind: form === normalized ? "lemma" : "inflection",
      })),
      { onConflict: "form,lexeme_id" },
    ),
    `forms ${s.slug}`,
  );

  const hash = createHash("sha256").update(JSON.stringify(s)).digest("hex");
  const sense = must(
    await db
      .from("senses")
      .upsert(
        {
          lexeme_id: lexeme.id,
          slug: s.slug,
          definition_en: s.def,
          meaning_vi: s.vi,
          meaning_vi_source: "curated",
          vi_usage_note: s.note ?? null,
          keep_english_in_vi: s.keep_en,
          topic: s.topic,
          review_status: "published",
          source_id: source.id,
          content_hash: hash,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single(),
    `sense ${s.slug}`,
  ) as { id: number };
  senseIds.set(s.slug, sense.id);

  must(
    await db.from("examples").upsert(
      s.examples.map((e) => ({
        sense_id: sense.id,
        text_en: e.en,
        text_vi: e.vi ?? null,
        source_id: source.id,
      })),
      { onConflict: "sense_id,text_en" },
    ),
    `examples ${s.slug}`,
  );
}
console.log(`senses: ${senseIds.size}`);

// ----- questions -----
let newVersions = 0;
for (const q of curated.questions) {
  const { prompt, answer, contentHash } = toQuestionRow(q);
  const existing = must(
    await db.from("questions").select("id, current_version_id").eq("slug", q.slug).maybeSingle(),
    `question ${q.slug}`,
  ) as { id: string; current_version_id: string | null } | null;

  const meta = {
    slug: q.slug,
    type: q.type,
    cefr: q.cefr,
    topic: q.topic,
    npc_id: q.npc ?? null,
    sense_ids: q.senses.map((s) => senseIds.get(s)!),
    status: "published" as const,
    origin: "human" as const,
    source_id: source.id,
  };
  const question = existing
    ? (must(
        await db.from("questions").update(meta).eq("id", existing.id).select("id").single(),
        q.slug,
      ) as { id: string })
    : (must(await db.from("questions").insert(meta).select("id").single(), q.slug) as {
        id: string;
      });

  const current = existing?.current_version_id
    ? (must(
        await db
          .from("question_versions")
          .select("content_hash, version")
          .eq("id", existing.current_version_id)
          .single(),
        q.slug,
      ) as { content_hash: string; version: number })
    : null;
  if (current?.content_hash === contentHash) continue;

  const version = must(
    await db
      .from("question_versions")
      .insert({
        question_id: question.id,
        version: (current?.version ?? 0) + 1,
        prompt,
        answer,
        hint_vi: q.hint_vi ?? null,
        explanation_vi: q.explanation_vi,
        explanation_en: q.explanation_en ?? null,
        content_hash: contentHash,
        generator: { source: "curated" },
      })
      .select("id")
      .single(),
    `version ${q.slug}`,
  ) as { id: string };
  must(
    await db.from("questions").update({ current_version_id: version.id }).eq("id", question.id),
    q.slug,
  );
  newVersions++;
}
console.log(`questions: ${curated.questions.length} (${newVersions} new versions)`);

// ----- dialogues -----
for (const d of curated.dialogues) {
  const graph = { entry: d.entry, nodes: d.nodes };
  const existing = must(
    await db.from("dialogues").select("id, version, graph").eq("slug", d.slug).maybeSingle(),
    `dialogue ${d.slug}`,
  ) as { id: string; version: number; graph: unknown } | null;
  const changed = !existing || JSON.stringify(existing.graph) !== JSON.stringify(graph);
  must(
    await db.from("dialogues").upsert(
      {
        slug: d.slug,
        npc_id: d.npc,
        title_en: d.title_en,
        title_vi: d.title_vi,
        cefr: d.cefr,
        version: existing ? existing.version + (changed ? 1 : 0) : 1,
        graph,
        unlock_level: d.unlock_level,
        sort_order: d.sort,
        xp_reward: d.xp,
        status: "published",
        origin: "human",
        source_id: source.id,
      },
      { onConflict: "slug" },
    ),
    `dialogue ${d.slug}`,
  );
}
console.log(`dialogues: ${curated.dialogues.length}`);
