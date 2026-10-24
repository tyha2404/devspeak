import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredAnswer, StoredPrompt } from "@/features/quiz/types";
import type { BatchRequest, BatchResult, LlmClient } from "./llm";
import { costMicros } from "./pricing";
import {
  blindSolveRequest,
  generationRequest,
  PROMPT_VERSION,
  QA_VERSION,
  rubricRequest,
  type GenerationTarget,
} from "./prompts";
import { BlindSolve, ItemPack, Rubric } from "./schema";
import { toRow, validateGenerated } from "./validators";

export const MODELS = {
  gen: process.env.ANTHROPIC_MODEL_GEN ?? "claude-sonnet-5-5",
  qa: process.env.ANTHROPIC_MODEL_QA ?? "claude-haiku-5-5",
  rubric: process.env.ANTHROPIC_MODEL_GEN ?? "claude-sonnet-5-5",
};

const TOPIC_NPC: Record<string, string> = {
  git: "tuan",
  "code-review": "tuan",
  debugging: "tuan",
  communication: "tuan",
  devops: "kenji",
  agile: "sarah",
  meetings: "sarah",
  hr: "linh",
  "small-talk": "dave",
  testing: "emma",
  architecture: "raj",
  client: "mike",
  security: "kenji",
};
const TARGET_PER_SENSE = 6;

const must = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
};

async function aiSourceId(db: SupabaseClient) {
  const row = must(
    await db
      .from("sources")
      .upsert(
        {
          slug: "claude-generated",
          name: "Generated with Claude, reviewed by DevQuest editors",
          license_spdx: "proprietary-own",
          attribution_text:
            "Exercises generated with Claude and reviewed by the DevQuest English team.",
          share_alike: false,
          commercial_ok: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single(),
    "source",
  ) as { id: number };
  return row.id;
}

/** Decide where a generated item goes after QA. Pure: unit-tested. */
export function decide(
  rubric: Rubric | null,
  solve: { answer: number } | "n/a" | null,
  answerIndex: number | null,
  warnings: string[],
  autoApprove: boolean,
): "auto_checked" | "in_review" {
  if (!rubric || solve === null) return "in_review";
  const solved = solve === "n/a" || (answerIndex !== null && solve.answer === answerIndex);
  const clean =
    rubric.solvable &&
    rubric.single_correct &&
    rubric.natural_english &&
    rubric.level_ok &&
    rubric.culturally_ok &&
    rubric.vi_explanation_ok &&
    rubric.distractor_quality >= 4 &&
    solved &&
    warnings.filter((w) => w !== "coverage_unchecked").length === 0;
  // Even clean items wait for a human until auto-approval is switched on (plan: first weeks).
  return clean && autoApprove ? "auto_checked" : "in_review";
}

/** Senses (published, with Vietnamese meaning) that still need generated exercises. */
export async function planTargets(
  db: SupabaseClient,
  maxPacks: number,
): Promise<GenerationTarget[]> {
  const senses = must(
    await db
      .from("senses")
      .select("id, slug, definition_en, meaning_vi, topic, lexemes(display, pos, cefr, id)")
      .eq("review_status", "published")
      .limit(2000),
    "senses",
  ) as unknown as {
    id: number;
    slug: string;
    definition_en: string;
    meaning_vi: string;
    topic: string | null;
    lexemes: { display: string; pos: string; cefr: string | null; id: number };
  }[];
  const questions = must(
    await db
      .from("questions")
      .select("sense_ids")
      .in("status", ["published", "draft", "auto_checked", "in_review"]),
    "questions",
  ) as { sense_ids: number[] }[];
  const count = new Map<number, number>();
  for (const q of questions) for (const s of q.sense_ids) count.set(s, (count.get(s) ?? 0) + 1);

  const lacking = senses
    .filter((s) => (count.get(s.id) ?? 0) < TARGET_PER_SENSE)
    .sort((a, b) => (count.get(a.id) ?? 0) - (count.get(b.id) ?? 0))
    .slice(0, maxPacks);

  const forms = must(
    await db
      .from("word_forms")
      .select("form, lexeme_id")
      .in(
        "lexeme_id",
        lacking.map((s) => s.lexemes.id),
      ),
    "forms",
  ) as { form: string; lexeme_id: number }[];

  return lacking.map((s) => ({
    senseId: s.id,
    senseSlug: s.slug,
    lemma: s.lexemes.display,
    pos: s.lexemes.pos,
    definition: s.definition_en,
    meaningVi: s.meaning_vi,
    cefr: s.lexemes.cefr ?? "B1",
    topic: s.topic ?? "communication",
    npcId: TOPIC_NPC[s.topic ?? ""] ?? "tuan",
    forms: forms.filter((f) => f.lexeme_id === s.lexemes.id).map((f) => f.form),
    variation: ((count.get(s.id) ?? 0) % 5) + 1,
  }));
}

async function submit(
  db: SupabaseClient,
  llm: LlmClient,
  kind: "questions" | "qa_solve" | "qa_rubric",
  model: string,
  items: { customId: string; target: unknown; request: BatchRequest["params"] }[],
  createdBy?: string,
) {
  if (!items.length) return null;
  const job = must(
    await db
      .from("generation_jobs")
      .insert({
        kind,
        model,
        prompt_version: kind === "questions" ? PROMPT_VERSION : QA_VERSION,
        request_count: items.length,
        created_by: createdBy ?? null,
      })
      .select("id")
      .single(),
    "job",
  ) as { id: string };
  must(
    await db
      .from("generation_items")
      .insert(items.map((i) => ({ job_id: job.id, custom_id: i.customId, target: i.target }))),
    "items",
  );
  try {
    const batchId = await llm.createBatch(
      items.map((i) => ({ customId: i.customId, params: i.request })),
    );
    must(
      await db
        .from("generation_jobs")
        .update({
          anthropic_batch_id: batchId,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", job.id),
      "job submitted",
    );
  } catch (e) {
    await db
      .from("generation_jobs")
      .update({ status: "failed", last_error: String(e) })
      .eq("id", job.id);
    throw e;
  }
  return job.id;
}

/** Plan + submit one generation batch (cron: daily at 00:00 ICT, or an editor's button). */
export async function submitGeneration(
  db: SupabaseClient,
  llm: LlmClient,
  opts: { maxPacks: number; createdBy?: string },
) {
  const targets = await planTargets(db, opts.maxPacks);
  // Group by NPC so requests sharing a persona prefix sit together (better cache hits).
  targets.sort((a, b) => a.npcId.localeCompare(b.npcId));
  const jobId = await submit(
    db,
    llm,
    "questions",
    MODELS.gen,
    targets.map((t) => ({
      customId: `gen-${t.senseSlug}-${t.variation}-${Date.now().toString(36)}`.slice(0, 64),
      target: t,
      request: generationRequest(MODELS.gen, t),
    })),
    opts.createdBy,
  );
  return { jobId, targets: targets.length };
}

async function logUsage(
  db: SupabaseClient,
  feature: string,
  model: string,
  batchId: string,
  r: BatchResult,
) {
  if (!r.usage) return;
  await db.from("api_usage").insert({
    feature,
    model,
    batch_id: batchId,
    input_tokens: r.usage.input_tokens,
    output_tokens: r.usage.output_tokens,
    cache_read_tokens: r.usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: r.usage.cache_creation_input_tokens ?? 0,
    cost_usd_micros: costMicros(model, r.usage, { batch: true }),
    status: r.type,
  });
}

async function commonWords(db: SupabaseClient, cefr: string) {
  const maxRank = cefr === "A1" || cefr === "A2" ? 2000 : 2809;
  const { data } = await db
    .from("lexemes")
    .select("normalized")
    .not("ngsl_rank", "is", null)
    .lte("ngsl_rank", maxRank)
    .limit(5000);
  return new Set((data ?? []).map((d) => d.normalized as string));
}

async function ingestQuestions(
  db: SupabaseClient,
  llm: LlmClient,
  job: { id: string; model: string },
  batchId: string,
  results: BatchResult[],
) {
  const sourceId = await aiSourceId(db);
  const created: {
    questionId: string;
    versionId: string;
    prompt: StoredPrompt;
    answer: StoredAnswer;
    warnings: string[];
  }[] = [];
  const wordCache = new Map<string, Set<string>>();

  for (const r of results) {
    const { data: item } = await db
      .from("generation_items")
      .select("target, status")
      .eq("job_id", job.id)
      .eq("custom_id", r.customId)
      .single();
    if (!item || item.status !== "pending") continue; // checkpointed: already processed
    await logUsage(db, "gen_questions", job.model, batchId, r);
    if (r.type !== "succeeded" || !r.text) {
      await db
        .from("generation_items")
        .update({ status: r.type === "expired" ? "expired" : "errored", error: r.error ?? r.type })
        .eq("job_id", job.id)
        .eq("custom_id", r.customId);
      continue;
    }
    const t = item.target as GenerationTarget;
    let pack: ItemPack;
    try {
      pack = ItemPack.parse(JSON.parse(r.text));
    } catch (e) {
      await db
        .from("generation_items")
        .update({ status: "invalid", error: `parse: ${String(e).slice(0, 300)}` })
        .eq("job_id", job.id)
        .eq("custom_id", r.customId);
      continue;
    }
    if (!wordCache.has(t.cefr)) wordCache.set(t.cefr, await commonWords(db, t.cefr));
    const ctx = {
      senseSlug: t.senseSlug,
      cefr: t.cefr,
      npcId: t.npcId,
      topic: t.topic,
      forms: t.forms,
      commonWords: wordCache.get(t.cefr)!,
    };

    const ids: string[] = [];
    const rejected: string[] = [];
    for (const [i, q] of pack.items.entries()) {
      const report = validateGenerated(q, ctx);
      if (!report.ok) {
        rejected.push(`${q.type}: ${report.errors.join(", ")}`);
        continue;
      }
      const slug = `ai-${t.senseSlug}-${q.type.replace(/_/g, "-")}-${r.customId.slice(-6)}-${i}`;
      const { prompt, answer, contentHash } = toRow(q, ctx, slug);
      const { data: existing } = await db
        .from("question_versions")
        .select("id")
        .eq("content_hash", contentHash)
        .maybeSingle();
      if (existing) {
        rejected.push(`${q.type}: duplicate`);
        continue;
      }
      const question = must(
        await db
          .from("questions")
          .insert({
            slug,
            type: q.type,
            cefr: t.cefr,
            topic: t.topic,
            npc_id: t.npcId,
            sense_ids: [t.senseId],
            status: "draft",
            origin: "ai",
            source_id: sourceId,
          })
          .select("id")
          .single(),
        slug,
      ) as { id: string };
      const version = must(
        await db
          .from("question_versions")
          .insert({
            question_id: question.id,
            version: 1,
            prompt,
            answer,
            hint_vi: q.hint_vi,
            explanation_vi: q.explanation_vi,
            content_hash: contentHash,
            generator: {
              model: job.model,
              prompt_version: PROMPT_VERSION,
              job_id: job.id,
              custom_id: r.customId,
            },
            qa_report: { validation: report },
          })
          .select("id")
          .single(),
        `${slug} v1`,
      ) as { id: string };
      await db.from("questions").update({ current_version_id: version.id }).eq("id", question.id);
      ids.push(question.id);
      created.push({
        questionId: question.id,
        versionId: version.id,
        prompt,
        answer,
        warnings: report.warnings,
      });
    }
    await db
      .from("generation_items")
      .update({
        status: ids.length ? "succeeded" : "invalid",
        result_question_ids: ids,
        error: rejected.length ? rejected.join(" | ").slice(0, 1000) : null,
      })
      .eq("job_id", job.id)
      .eq("custom_id", r.customId);
  }

  // Second pass: blind solve (different model) + rubric for every new draft.
  const solvable = created.filter((c) => c.answer.kind === "choice");
  await submit(
    db,
    llm,
    "qa_solve",
    MODELS.qa,
    solvable.map((c) => ({
      customId: `solve-${c.versionId}`,
      target: { versionId: c.versionId },
      request: blindSolveRequest(MODELS.qa, c.prompt),
    })),
  );
  await submit(
    db,
    llm,
    "qa_rubric",
    MODELS.rubric,
    created.map((c) => ({
      customId: `rubric-${c.versionId}`,
      target: { versionId: c.versionId },
      request: rubricRequest(MODELS.rubric, { prompt: c.prompt, answer: c.answer }),
    })),
  );
  for (const c of created.filter((x) => x.answer.kind !== "choice")) {
    await mergeQa(db, c.versionId, { solve: "n/a" });
  }
}

async function mergeQa(db: SupabaseClient, versionId: string, patch: Record<string, unknown>) {
  const { data: v } = await db
    .from("question_versions")
    .select("qa_report, answer, question_id")
    .eq("id", versionId)
    .single();
  if (!v) return;
  const report = { ...(v.qa_report as Record<string, unknown>), ...patch };
  await db.from("question_versions").update({ qa_report: report }).eq("id", versionId);
  if ("rubric" in report && "solve" in report) {
    const answer = v.answer as StoredAnswer;
    const answerIndex = answer.kind === "choice" ? Number(answer.correct.slice(1)) : null;
    const validation = report.validation as { warnings: string[] } | undefined;
    const status = decide(
      report.rubric as Rubric | null,
      report.solve as { answer: number } | "n/a" | null,
      answerIndex,
      validation?.warnings ?? [],
      process.env.AI_AUTO_APPROVE === "true",
    );
    await db.from("questions").update({ status }).eq("id", v.question_id).eq("status", "draft");
  }
}

async function ingestQa(
  db: SupabaseClient,
  kind: "qa_solve" | "qa_rubric",
  job: { id: string; model: string },
  batchId: string,
  results: BatchResult[],
) {
  for (const r of results) {
    const { data: item } = await db
      .from("generation_items")
      .select("target, status")
      .eq("job_id", job.id)
      .eq("custom_id", r.customId)
      .single();
    if (!item || item.status !== "pending") continue;
    await logUsage(db, kind, job.model, batchId, r);
    const versionId = (item.target as { versionId: string }).versionId;
    let value: unknown = null;
    if (r.type === "succeeded" && r.text) {
      const parsed = (kind === "qa_solve" ? BlindSolve : Rubric).safeParse(JSON.parse(r.text));
      value = parsed.success ? parsed.data : null;
    }
    // A failed QA call still records `null`, which forces human review.
    await mergeQa(db, versionId, kind === "qa_solve" ? { solve: value } : { rubric: value });
    await db
      .from("generation_items")
      .update({ status: value ? "succeeded" : "errored" })
      .eq("job_id", job.id)
      .eq("custom_id", r.customId);
  }
}

/** Poll submitted batches and ingest finished ones (cron: every 15 min). Resumable. */
export async function pollBatches(
  db: SupabaseClient,
  llm: LlmClient,
  opts: { maxResults?: number } = {},
) {
  const maxResults = opts.maxResults ?? 300;
  const jobs = must(
    await db
      .from("generation_jobs")
      .select("id, kind, model, anthropic_batch_id, status")
      .in("status", ["submitted", "ingesting"])
      .order("created_at"),
    "jobs",
  ) as { id: string; kind: string; model: string; anthropic_batch_id: string; status: string }[];
  const summary: { jobId: string; kind: string; state: string }[] = [];
  let budget = maxResults;

  for (const job of jobs) {
    if (budget <= 0) break;
    const status = await llm.batchStatus(job.anthropic_batch_id);
    if (!status.ended) {
      summary.push({ jobId: job.id, kind: job.kind, state: "running" });
      continue;
    }
    await db
      .from("generation_jobs")
      .update({
        status: "ingesting",
        ended_at: new Date().toISOString(),
        succeeded: status.succeeded,
        errored: status.errored + status.expired,
      })
      .eq("id", job.id);

    const results: BatchResult[] = [];
    for await (const r of llm.batchResults(job.anthropic_batch_id)) {
      results.push(r);
      if (results.length >= budget) break;
    }
    budget -= results.length;
    if (job.kind === "questions")
      await ingestQuestions(db, llm, job, job.anthropic_batch_id, results);
    else
      await ingestQa(
        db,
        job.kind as "qa_solve" | "qa_rubric",
        job,
        job.anthropic_batch_id,
        results,
      );

    const { count } = await db
      .from("generation_items")
      .select("custom_id", { count: "exact", head: true })
      .eq("job_id", job.id)
      .eq("status", "pending");
    const done = (count ?? 0) === 0;
    if (done)
      await db
        .from("generation_jobs")
        .update({ status: "ingested", ingested_at: new Date().toISOString() })
        .eq("id", job.id);
    summary.push({ jobId: job.id, kind: job.kind, state: done ? "ingested" : "partial" });
  }
  return summary;
}
