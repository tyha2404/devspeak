import { describe, expect, it } from "vitest";
import { fakeGenerate } from "@/features/ai/client";
import { FakeLlm } from "@/features/ai/llm";
import { pollBatches, submitGeneration } from "@/features/ai/pipeline";
import { admin } from "./helpers";

describe("AI generation pipeline (fake LLM)", () => {
  it("generates, validates, QA-checks and queues items for human review", async () => {
    const llm = new FakeLlm(fakeGenerate);
    const { jobId, targets } = await submitGeneration(admin, llm, { maxPacks: 2 });
    expect(targets).toBe(2);
    const first = await pollBatches(admin, llm);
    expect(first.find((s) => s.jobId === jobId)?.state).toBe("ingested");

    const { data: items } = await admin
      .from("generation_items")
      .select("status, result_question_ids")
      .eq("job_id", jobId!);
    expect(items!.every((i) => i.status === "succeeded")).toBe(true);
    const ids = items!.flatMap((i) => i.result_question_ids as string[]);
    expect(ids.length).toBe(6); // 3 valid items per fake pack

    // QA batches were submitted; a second poll ingests them and moves items out of draft.
    await pollBatches(admin, llm);
    const { data: qs } = await admin
      .from("questions")
      .select("status, origin, question_versions!questions_current_version_fk(qa_report)")
      .in("id", ids);
    expect(qs!.every((q) => q.origin === "ai" && q.status === "in_review")).toBe(true);
    const report = (qs![0]!.question_versions as unknown as { qa_report: Record<string, unknown> })
      .qa_report;
    expect(report).toHaveProperty("rubric");
    expect(report).toHaveProperty("solve");

    const { data: usage } = await admin
      .from("api_usage")
      .select("cost_usd_micros")
      .eq("feature", "gen_questions");
    expect(usage!.length).toBeGreaterThanOrEqual(2);
  });

  it("marks unparseable output invalid without failing the batch", async () => {
    const llm = new FakeLlm((params) =>
      JSON.stringify(params.system).includes("pixel-art office")
        ? "not json"
        : fakeGenerate(params),
    );
    const { jobId } = await submitGeneration(admin, llm, { maxPacks: 1 });
    await pollBatches(admin, llm);
    const { data: items } = await admin
      .from("generation_items")
      .select("status, error")
      .eq("job_id", jobId!);
    expect(items![0]).toMatchObject({ status: "invalid" });
    const { data: job } = await admin
      .from("generation_jobs")
      .select("status")
      .eq("id", jobId!)
      .single();
    expect(job!.status).toBe("ingested");
  });
});
