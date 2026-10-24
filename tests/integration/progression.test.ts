import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { mergeGuest } from "@/features/account/service";
import { getDaily, learnDaily } from "@/features/daily/service";
import {
  finishBoss,
  finishPlacement,
  startBoss,
  startPlacement,
} from "@/features/promotion/service";
import { recordEvent } from "@/features/quests/progression";
import { nextDelivery, submitAnswer } from "@/features/quiz/service";
import { buy, ShopError } from "@/features/shop/service";
import { reviewQueue, submitReview } from "@/features/srs/service";
import { admin, humanPause, newUser } from "./helpers";

async function answerSession(userId: string, sessionId: string, correct: (i: number) => boolean) {
  let i = 0;
  for (;;) {
    const d = await nextDelivery(admin, userId, sessionId);
    if ("done" in d) return d;
    const { data } = await admin
      .from("question_deliveries")
      .select("option_map, question_versions(answer, prompt)")
      .eq("id", d.deliveryId)
      .single();
    const map = data!.option_map as Record<string, string>;
    const v = data!.question_versions as unknown as {
      answer: Record<string, unknown>;
      prompt: { tokens?: { id: string; text: string }[] };
    };
    const opaque = (c: string) => Object.entries(map).find(([, x]) => x === c)![0];
    await humanPause();
    const ok = correct(i++);
    const a = v.answer as {
      kind: string;
      correct?: string;
      accepted?: string[];
      text?: string;
      wrong?: string;
    };
    const response =
      a.kind === "choice"
        ? { kind: "choice" as const, optionId: ok ? opaque(a.correct!) : "nope" }
        : a.kind === "text"
          ? { kind: "text" as const, text: ok ? a.accepted![0]! : "zzzz" }
          : a.kind === "fix"
            ? {
                kind: "fix" as const,
                tokenId: opaque(a.wrong!),
                optionId: ok ? opaque(a.correct!) : "nope",
              }
            : {
                kind: "order" as const,
                tokenIds: ok ? v.prompt.tokens!.map((_, k) => opaque(`t${k}`)) : ["x"],
              };
    let r = await submitAnswer(admin, userId, d.deliveryId, response);
    if (!r.final) r = await submitAnswer(admin, userId, d.deliveryId, response);
  }
}

describe("daily words", () => {
  it("materialises a stable set, pays XP once and a bonus at 5/5", async () => {
    const user = await newUser();
    const a = await getDaily(admin, user);
    const b = await getDaily(admin, user);
    expect(a.words.map((w) => w.slug)).toEqual(b.words.map((w) => w.slug));
    expect(a.words.length).toBe(5);
    for (const w of a.words) await learnDaily(admin, user, w.slug, false);
    const again = await learnDaily(admin, user, a.words[0]!.slug, false);
    expect(again!.award.duplicate).toBe(true);
    const { data: p } = await admin.from("profiles").select("xp_total").eq("id", user).single();
    expect(p!.xp_total).toBe(5 * 5 + 25);
    const { count } = await admin
      .from("user_cards")
      .select("sense_id", { count: "exact", head: true })
      .eq("user_id", user);
    expect(count).toBe(5);
  });
});

describe("SRS review", () => {
  it("pays XP only for a verified, due review and is idempotent", async () => {
    const user = await newUser();
    const daily = await getDaily(admin, user);
    await learnDaily(admin, user, daily.words[0]!.slug, false);
    const q = await reviewQueue(admin, user);
    expect(q.dueCount).toBe(1);
    const card = q.cards[0]!;
    const before = (await admin.from("profiles").select("xp_total").eq("id", user).single()).data!
      .xp_total;

    // Self-rating alone: schedules but pays nothing.
    const id1 = crypto.randomUUID();
    const r1 = await submitReview(admin, user, { clientReviewId: id1, slug: card.slug, rating: 3 });
    expect(r1).toMatchObject({ xp: 0, verified: null });
    const dup = await submitReview(admin, user, {
      clientReviewId: id1,
      slug: card.slug,
      rating: 3,
    });
    expect(dup).toMatchObject({ duplicate: true });
    const after = (await admin.from("profiles").select("xp_total").eq("id", user).single()).data!
      .xp_total;
    expect(after).toBe(before);

    // Verified review on a due card earns 3 XP.
    await admin
      .from("user_cards")
      .update({ due: new Date(Date.now() - 1000).toISOString() })
      .eq("user_id", user);
    const q2 = await reviewQueue(admin, user);
    await answerSession(user, q2.sessionId!, () => true);
    const { data: d } = await admin
      .from("question_deliveries")
      .select("id")
      .eq("session_id", q2.sessionId!)
      .single();
    const r2 = await submitReview(admin, user, {
      clientReviewId: crypto.randomUUID(),
      slug: card.slug,
      rating: 3,
      deliveryId: d!.id,
    });
    expect(r2).toMatchObject({ verified: true, xp: 3 });
  });
});

describe("quests", () => {
  it("progress from events and claim exactly once", async () => {
    const user = await newUser();
    const up = await recordEvent(admin, user, [
      { type: "dialogue_complete", npcId: "sarah" },
      { type: "dialogue_complete", npcId: "tuan" },
      { type: "dialogue_complete", npcId: "linh" },
      { type: "dialogue_complete", npcId: "dave" },
    ]);
    const talk = up.quests.find((q) => q.key.startsWith("talk_to:"))!;
    expect(talk.completed).toBe(true);
    const { data: row } = await admin
      .from("user_quests")
      .select("period_key")
      .eq("user_id", user)
      .eq("quest_key", talk.key)
      .single();
    const c1 = await admin.rpc("svc_claim_quest", {
      p_user: user,
      p_key: talk.key,
      p_period: row!.period_key,
    });
    expect(c1.error).toBeNull();
    const c2 = await admin.rpc("svc_claim_quest", {
      p_user: user,
      p_key: talk.key,
      p_period: row!.period_key,
    });
    expect(c2.error?.hint).toBe("ALREADY_CLAIMED");
  });
});

describe("shop", () => {
  it("refuses without coins and sells a PTO day when affordable", async () => {
    const user = await newUser();
    await expect(buy(admin, user, "pto-day")).rejects.toMatchObject({
      code: "NOT_ENOUGH_COINS",
    } satisfies Partial<ShopError>);
    await admin.rpc("svc_award_xp", {
      p_user: user,
      p_amount: 10,
      p_reason: "admin_adjust",
      p_key: "coins",
      p_coins: 100,
    });
    const r = await buy(admin, user, "pto-day");
    expect(r.coins).toBe(40);
    const { data: p } = await admin
      .from("profiles")
      .select("streak_freezes")
      .eq("id", user)
      .single();
    expect(p!.streak_freezes).toBe(1);
  });
});

describe("promotion boss", () => {
  it("is locked below level 6, then promotes to Junior on a pass", async () => {
    const user = await newUser();
    await expect(startBoss(admin, user)).rejects.toMatchObject({ code: "LOCKED" });
    await admin.rpc("svc_award_xp", {
      p_user: user,
      p_amount: 1300,
      p_reason: "admin_adjust",
      p_key: "lvl",
    });
    const boss = await startBoss(admin, user);
    expect(boss.total).toBe(8);
    await answerSession(user, boss.sessionId, () => true);
    const r = await finishBoss(admin, user, boss.sessionId);
    expect(r).toMatchObject({ passed: true, perfect: true, rank: "junior" });
  });

  it("fails below 70% and keeps the rank", async () => {
    const user = await newUser();
    await admin.rpc("svc_award_xp", {
      p_user: user,
      p_amount: 1300,
      p_reason: "admin_adjust",
      p_key: "lvl",
    });
    const boss = await startBoss(admin, user);
    await answerSession(user, boss.sessionId, (i) => i < 3);
    const r = await finishBoss(admin, user, boss.sessionId);
    expect(r).toMatchObject({ passed: false, rank: "intern" });
  });
});

describe("placement", () => {
  it("places a strong learner at Mid with the matching XP", async () => {
    const user = await newUser();
    const p = await startPlacement(admin, user);
    await answerSession(user, p.sessionId, () => true);
    const r = await finishPlacement(admin, user, p.sessionId);
    expect(r.cefr).toBe("B2");
    const { data: prof } = await admin
      .from("profiles")
      .select("level, rank, placement_level")
      .eq("id", user)
      .single();
    expect(prof).toMatchObject({ level: 13, rank: "mid", placement_level: "B2" });
    await expect(startPlacement(admin, user)).rejects.toMatchObject({ code: "ALREADY_DONE" });
  });
});

describe("guest merge", () => {
  it("moves a guest's XP and cards into the registered account", async () => {
    // A separate client: signing in on the shared admin client would replace its service-role session.
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { persistSession: false },
      },
    );
    const { data: guest } = await anon.auth.signInAnonymously();
    const guestId = guest.user!.id;
    await admin.rpc("svc_award_xp", {
      p_user: guestId,
      p_amount: 120,
      p_reason: "admin_adjust",
      p_key: "g",
    });
    const daily = await getDaily(admin, guestId);
    await learnDaily(admin, guestId, daily.words[0]!.slug, false);
    const owner = await newUser();
    const r = await mergeGuest(admin, owner, guest.session!.access_token);
    expect(r).toMatchObject({ merged: true, cards: 1 });
    const { data: p } = await admin.from("profiles").select("xp_total").eq("id", owner).single();
    expect(p!.xp_total).toBe(125);
    const { data: gone } = await admin.auth.admin.getUserById(guestId);
    expect(gone.user).toBeNull();
  });
});

describe("higher-rank bosses", () => {
  it.each([
    ["junior", "mid", 5200],
    ["mid", "senior", 11600],
    ["senior", "techlead", 21600],
  ])("%s → %s has a full 8-question themed boss and promotes on a pass", async (from, to, xp) => {
    const user = await newUser();
    for (let left = xp, i = 0; left > 0; left -= 5000, i++) {
      await admin.rpc("svc_award_xp", {
        p_user: user,
        p_amount: Math.min(left, 5000),
        p_reason: "admin_adjust",
        p_key: `lvl-${i}`,
      });
    }
    await admin.from("profiles").update({ rank: from }).eq("id", user);
    const boss = await startBoss(admin, user);
    expect(boss.total).toBe(8);
    await answerSession(user, boss.sessionId, () => true);
    expect((await finishBoss(admin, user, boss.sessionId)).rank).toBe(to);
  });
});
