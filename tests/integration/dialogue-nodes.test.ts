import { beforeAll, describe, expect, it } from "vitest";
import { advanceDialogue, startDialogueRun } from "@/features/dialogue/service";
import { admin, newUser } from "./helpers";

beforeAll(() => {
  process.env.LLM_FAKE = "1";
});

async function start(userId: string, slug: string) {
  const { data } = await admin.from("dialogues").select("id").eq("slug", slug).single();
  return startDialogueRun(admin, userId, data!.id);
}

describe("speak and freewrite nodes", () => {
  it("scores a spoken standup by key phrases", async () => {
    const user = await newUser();
    let step = await start(user, "sarah-speaking-standup");
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
    let step = await start(user, "raj-pr-review");
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
