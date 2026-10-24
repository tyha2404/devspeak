import { beforeAll, describe, expect, it } from "vitest";
import { advanceDialogue, startDialogue } from "@/features/dialogue/service";
import { admin, newUser } from "./helpers";

beforeAll(() => {
  process.env.LLM_FAKE = "1";
});

/** Walk Sarah's first two dialogues quickly by marking them done, so the speaking one comes next. */
async function skipTo(userId: string, npcId: string, slug: string) {
  const { data: ds } = await admin
    .from("dialogues")
    .select("id, slug, version")
    .eq("npc_id", npcId)
    .order("sort_order");
  for (const d of ds ?? []) {
    if (d.slug === slug) break;
    await admin.from("dialogue_runs").insert({
      user_id: userId,
      dialogue_id: d.id,
      dialogue_version: d.version,
      current_node: "end",
      completed_at: new Date().toISOString(),
    });
  }
}

describe("speak and freewrite nodes", () => {
  it("scores a spoken standup by key phrases", async () => {
    const user = await newUser();
    await skipTo(user, "sarah", "sarah-speaking-standup");
    let step = await startDialogue(admin, user, "sarah", 1);
    expect(step.title.en).toBe("Standup, out loud");
    step = await advanceDialogue(admin, user, step.runId);
    expect(step.node.type).toBe("speak");
    await expect(advanceDialogue(admin, user, step.runId)).rejects.toMatchObject({
      code: "BAD_CHOICE",
    });
    step = await advanceDialogue(
      admin,
      user,
      step.runId,
      undefined,
      "Yesterday I fixed the login bug. Today I will write tests. No blockers.",
    );
    expect(step.feedback).toMatchObject({ quality: "best" });
  });

  it("grades a free-text PR reply (heuristic without an API key)", async () => {
    const user = await newUser();
    let step = await startDialogue(admin, user, "raj", 6);
    expect(step.title.en).toBe("Replying to review comments");
    step = await advanceDialogue(admin, user, step.runId);
    expect(step.node.type).toBe("freewrite");
    step = await advanceDialogue(
      admin,
      user,
      step.runId,
      undefined,
      "Thanks for the comment, good point! I will rename it to getUserOrders.",
    );
    expect(step.feedback?.quality).toBe("best");
  });
});
