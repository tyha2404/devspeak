"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLlm } from "@/features/ai/client";
import { pollBatches, submitGeneration } from "@/features/ai/pipeline";
import { requireEditor } from "@/features/admin/auth";
import { QuestionSpec } from "@/features/content/curated";
import { toQuestionRow } from "@/features/content/toQuestionRow";
import { createAdminClient } from "@/lib/supabase/admin";

async function log(
  actorId: string,
  entity: string,
  entityId: string,
  action: string,
  reason?: string,
  diff?: unknown,
) {
  await createAdminClient()
    .from("moderation_actions")
    .insert({ actor_id: actorId, entity, entity_id: entityId, action, reason, diff });
}

export async function reviewQuestion(form: FormData) {
  const { userId } = await requireEditor();
  const { id, decision, reason } = z
    .object({
      id: z.uuid(),
      decision: z.enum(["approve", "reject"]),
      reason: z.string().max(200).optional(),
    })
    .parse(Object.fromEntries(form));
  const db = createAdminClient();
  await db
    .from("questions")
    .update({ status: decision === "approve" ? "published" : "rejected" })
    .eq("id", id);
  await log(userId, "question", id, decision, reason);
  revalidatePath("/admin/moderation");
}

/** Edit-and-approve: the edited item becomes a new version (history stays intact). */
export async function editQuestion(form: FormData) {
  const { userId } = await requireEditor();
  const id = z.uuid().parse(form.get("id"));
  const spec = QuestionSpec.parse(JSON.parse(String(form.get("spec"))));
  const { prompt, answer, contentHash } = toQuestionRow(spec);
  const db = createAdminClient();
  const { data: cur } = await db
    .from("question_versions")
    .select("version")
    .eq("question_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  const { data: v, error } = await db
    .from("question_versions")
    .insert({
      question_id: id,
      version: (cur?.version ?? 0) + 1,
      prompt,
      answer,
      hint_vi: spec.hint_vi ?? null,
      explanation_vi: spec.explanation_vi,
      content_hash: contentHash,
      generator: { edited_by: userId },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await db.from("questions").update({ current_version_id: v.id, status: "published" }).eq("id", id);
  await log(userId, "question", id, "edit", undefined, spec);
  revalidatePath("/admin/moderation");
}

export async function resolveReport(form: FormData) {
  const { userId } = await requireEditor();
  const id = z.coerce.number().int().parse(form.get("id"));
  const db = createAdminClient();
  const { data: r } = await db
    .from("question_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select("question_id")
    .single();
  if (r) await db.rpc("svc_bump_report", { p_question: r.question_id });
  await log(userId, "report", String(id), "resolve");
  revalidatePath("/admin/reports");
}

export async function publishSense(form: FormData) {
  const { userId } = await requireEditor();
  const { id, meaning_vi } = z
    .object({ id: z.coerce.number().int(), meaning_vi: z.string().min(1).max(200) })
    .parse(Object.fromEntries(form));
  await createAdminClient()
    .from("senses")
    .update({
      meaning_vi,
      review_status: "published",
      locked_by_review: true,
      meaning_vi_source: "editor",
    })
    .eq("id", id);
  await log(userId, "sense", String(id), "approve", undefined, { meaning_vi });
  revalidatePath("/admin/senses");
}

export async function runGeneration() {
  const { userId } = await requireEditor("admin");
  await submitGeneration(createAdminClient(), getLlm(), {
    maxPacks: Number(process.env.AI_DAILY_PACKS ?? 20),
    createdBy: userId,
  });
  revalidatePath("/admin");
}

export async function runPoll() {
  await requireEditor("admin");
  await pollBatches(createAdminClient(), getLlm());
  revalidatePath("/admin");
}
