/**
 * Upserts hand-written content (content/curated/**, content/curriculum/**) into Postgres, plus the
 * generated track tests. Idempotent:
 *   - senses/examples upsert by slug
 *   - a question gets a new version only when its content hash changes
 *   - stages/units/lessons upsert by slug; a lesson's question list is replaced each run
 *
 * Usage: pnpm seed:content   (reads .env.local for the service-role key)
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { toQuestionRow } from "../src/features/content/toQuestionRow";
import { DEFAULT_MINUTES } from "../src/features/curriculum/schema";
import { loadCurated, validateCurated } from "./lib/curated";
import { expandTrackLessons, loadCurriculum, validateCurriculum } from "./lib/curriculum";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false } });

const must = <T,>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
};

const curated = loadCurated();
const curriculum = loadCurriculum();
const pathErrors = validateCurriculum(curriculum, curated);
if (pathErrors.length) {
  console.error(pathErrors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
// Track tests are generated from lesson content and seeded with the curated bank.
const generatedQuestions = expandTrackLessons(curriculum, curated);
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
console.log(
  `questions: ${curated.questions.length} (${generatedQuestions} generated, ${newVersions} new versions)`,
);

// ----- learning path -----

const stageIds = new Map<string, number>();
for (const s of curriculum.stages) {
  const row = must(
    await db
      .from("stages")
      .upsert(
        {
          slug: s.slug,
          sort: s.sort,
          track: s.track,
          cefr: s.cefr,
          title_en: s.title.en,
          title_vi: s.title.vi,
          tagline_vi: s.tagline_vi,
          description_vi: s.description_vi,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single(),
    `stage ${s.slug}`,
  ) as { id: number };
  stageIds.set(s.slug, row.id);
}

// PostgREST returns at most 1000 rows per request, so page through the bank.
const questionIds = new Map<string, string>();
for (let from = 0; ; from += 1000) {
  const page = must(
    await db
      .from("questions")
      .select("id, slug")
      .order("id")
      .range(from, from + 999),
    "question ids",
  ) as { id: string; slug: string }[];
  for (const q of page) questionIds.set(q.slug, q.id);
  if (page.length < 1000) break;
}

let lessonCount = 0;
for (const u of curriculum.units) {
  const unit = must(
    await db
      .from("units")
      .upsert(
        {
          slug: u.slug,
          stage_id: stageIds.get(u.stage)!,
          sort: u.sort,
          code: u.code,
          kind: u.kind,
          cefr: u.cefr,
          title_en: u.title.en,
          title_vi: u.title.vi,
          summary_vi: u.summary_vi,
          can_do: u.can_do,
          status: u.status,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single(),
    `unit ${u.slug}`,
  ) as { id: number };

  // Lessons removed from the YAML disappear (with their progress) — fine before launch.
  const keep = u.lessons.map((l) => l.slug);
  must(
    await db
      .from("lessons")
      .delete()
      .eq("unit_id", unit.id)
      .not("slug", "in", `(${keep.map((s) => `"${s}"`).join(",") || '""'})`),
    `prune lessons ${u.slug}`,
  );
  // Shift existing sorts out of the way so reordering can't trip unique (unit_id, sort).
  const { data: existing } = await db.from("lessons").select("id, sort").eq("unit_id", unit.id);
  for (const l of existing ?? [])
    await db
      .from("lessons")
      .update({ sort: 1000 + l.sort })
      .eq("id", l.id);

  for (const [i, l] of u.lessons.entries()) {
    const body = l.kind === "vocab" ? { senses: l.senses } : { grammar: l.grammar };
    const row = must(
      await db
        .from("lessons")
        .upsert(
          {
            unit_id: unit.id,
            slug: l.slug,
            sort: i + 1,
            kind: l.kind,
            title_en: l.title.en,
            title_vi: l.title.vi,
            est_minutes: l.est_minutes ?? DEFAULT_MINUTES[l.kind],
            // Best-pass XP (3 stars); every track test passes at 80%.
            xp: 80,
            pass_pct: 80,
            question_count: l.questions.length,
            body,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single(),
      `lesson ${l.slug}`,
    ) as { id: number };
    must(await db.from("lesson_questions").delete().eq("lesson_id", row.id), l.slug);
    if (l.questions.length)
      must(
        await db.from("lesson_questions").insert(
          l.questions.map((q, sort) => ({
            lesson_id: row.id,
            question_id: questionIds.get(q)!,
            sort,
          })),
        ),
        `lesson questions ${l.slug}`,
      );
    lessonCount++;
  }
}
console.log(
  `path: ${curriculum.stages.length} stages, ${curriculum.units.length} units ` +
    `(${curriculum.units.filter((u) => u.status === "published").length} published), ${lessonCount} lessons`,
);
