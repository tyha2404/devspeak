import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { localDate } from "@/lib/time";

// ----- quests ("sprint tickets") -----
export interface QuestTemplate {
  key: string;
  kind: "daily" | "weekly";
  goal: number;
  title: { en: string; vi: string };
  rewardXp: number;
  rewardCoins: number;
}

const NPC_ROTATION = ["sarah", "tuan", "linh", "dave"];
const NPC_NAME: Record<string, string> = {
  sarah: "Sarah",
  tuan: "Tuấn",
  linh: "Linh",
  dave: "Dave",
  emma: "Emma",
};

export const QUEST_TEMPLATES = {
  learn_words: { goal: 5, title: { en: "Learn 5 words of the day", vi: "Học 5 từ hôm nay" } },
  review_cards: {
    goal: 10,
    title: { en: "Review 10 notebook cards", vi: "Ôn 10 thẻ trong sổ tay" },
  },
  answer_correct: {
    goal: 8,
    title: { en: "Answer 8 questions correctly", vi: "Trả lời đúng 8 câu" },
  },
  listen_correct: { goal: 3, title: { en: "Ace 3 listening questions", vi: "Nghe đúng 3 câu" } },
} as const;

function seededIndex(seed: string, n: number) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % n;
}

export const weekKey = (day: string) => {
  // ISO week, matching Postgres to_char(…, 'IYYY-"W"IW')
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

/** Today's three tickets: one vocab/review, one NPC conversation, one skill. Deterministic per user+day. */
export function dailyQuestsFor(userId: string, day: string, hasCards: boolean): QuestTemplate[] {
  const npc = NPC_ROTATION[seededIndex(day, NPC_ROTATION.length)]!;
  const first =
    hasCards && seededIndex(`${userId}:${day}:a`, 2) === 1 ? "review_cards" : "learn_words";
  const third = seededIndex(`${userId}:${day}:c`, 2) === 0 ? "answer_correct" : "listen_correct";
  const mk = (key: keyof typeof QUEST_TEMPLATES): QuestTemplate => ({
    key,
    kind: "daily",
    ...QUEST_TEMPLATES[key],
    rewardXp: 50,
    rewardCoins: 10,
  });
  return [
    mk(first),
    {
      key: `talk_to:${npc}`,
      kind: "daily",
      goal: 1,
      title: { en: `Talk to ${NPC_NAME[npc]}`, vi: `Nói chuyện với ${NPC_NAME[npc]}` },
      rewardXp: 50,
      rewardCoins: 10,
    },
    mk(third),
  ];
}

export const WEEKLY_SPRINT: QuestTemplate = {
  key: "weekly_xp",
  kind: "weekly",
  goal: 1500,
  title: { en: "Weekly sprint: earn 1,500 XP", vi: "Sprint tuần: kiếm 1.500 XP" },
  rewardXp: 100,
  rewardCoins: 100,
};

/** Make sure today's and this week's quests exist (idempotent). */
export async function ensureQuests(db: SupabaseClient, userId: string, tz: string) {
  const day = localDate(new Date(), tz);
  const { count } = await db
    .from("user_cards")
    .select("sense_id", { count: "exact", head: true })
    .eq("user_id", userId);
  const rows = [
    ...dailyQuestsFor(userId, day, (count ?? 0) >= 10).map((q) => ({ ...q, period: day })),
    { ...WEEKLY_SPRINT, period: weekKey(day) },
  ].map((q) => ({
    user_id: userId,
    quest_key: q.key,
    period_key: q.period,
    kind: q.kind,
    goal: q.goal,
    reward_xp: q.rewardXp,
    reward_coins: q.rewardCoins,
  }));
  await db
    .from("user_quests")
    .upsert(rows, { onConflict: "user_id,quest_key,period_key", ignoreDuplicates: true });
  return { day, week: weekKey(day) };
}

export function questTitle(key: string) {
  if (key.startsWith("talk_to:")) {
    const npc = key.split(":")[1]!;
    return { en: `Talk to ${NPC_NAME[npc] ?? npc}`, vi: `Nói chuyện với ${NPC_NAME[npc] ?? npc}` };
  }
  if (key === "weekly_xp") return WEEKLY_SPRINT.title;
  return QUEST_TEMPLATES[key as keyof typeof QUEST_TEMPLATES]?.title ?? { en: key, vi: key };
}

// ----- achievements -----
export interface Stats {
  dialogues: number;
  correct: number;
  correctFix: number;
  correctTuan: number;
  hints: number;
  cards: number;
  streak: number;
  rank: string;
  questsClaimed: number;
  perfectBoss: boolean;
  hourIct: number;
}

export const ACHIEVEMENTS: {
  id: string;
  icon: string;
  title: { en: string; vi: string };
  desc: string;
  test: (s: Stats) => boolean;
}[] = [
  {
    id: "hello-world",
    icon: "👋",
    title: { en: "Hello World", vi: "Hello World" },
    desc: "Hoàn thành cuộc hội thoại đầu tiên",
    test: (s) => s.dialogues >= 1,
  },
  {
    id: "first-commit",
    icon: "🟩",
    title: { en: "First Commit", vi: "First Commit" },
    desc: "Có ngày streak đầu tiên",
    test: (s) => s.streak >= 1,
  },
  {
    id: "on-call-hero",
    icon: "📟",
    title: { en: "On-call Hero", vi: "On-call Hero" },
    desc: "Streak 7 ngày",
    test: (s) => s.streak >= 7,
  },
  {
    id: "uptime",
    icon: "⏱️",
    title: { en: "Uptime 99.9%", vi: "Uptime 99.9%" },
    desc: "Streak 30 ngày",
    test: (s) => s.streak >= 30,
  },
  {
    id: "lgtm",
    icon: "👍",
    title: { en: "LGTM", vi: "LGTM" },
    desc: "Trả lời đúng 20 câu của Tuấn",
    test: (s) => s.correctTuan >= 20,
  },
  {
    id: "clean-code",
    icon: "🧹",
    title: { en: "Clean Code", vi: "Clean Code" },
    desc: "Sửa đúng 10 câu lỗi ngữ pháp",
    test: (s) => s.correctFix >= 10,
  },
  {
    id: "rubber-duck",
    icon: "🦆",
    title: { en: "Rubber Duck Debugging", vi: "Rubber Duck Debugging" },
    desc: "Dùng 25 gợi ý",
    test: (s) => s.hints >= 25,
  },
  {
    id: "ten-x",
    icon: "🚀",
    title: { en: "10x Developer", vi: "10x Developer" },
    desc: "100 từ trong sổ tay",
    test: (s) => s.cards >= 100,
  },
  {
    id: "polyglot",
    icon: "🌐",
    title: { en: "Polyglot Stack", vi: "Polyglot Stack" },
    desc: "1.000 từ trong sổ tay",
    test: (s) => s.cards >= 1000,
  },
  {
    id: "inbox-zero",
    icon: "📭",
    title: { en: "Inbox Zero", vi: "Inbox Zero" },
    desc: "Nhận thưởng 21 sprint ticket",
    test: (s) => s.questsClaimed >= 21,
  },
  {
    id: "zero-downtime",
    icon: "💯",
    title: { en: "Zero Downtime", vi: "Zero Downtime" },
    desc: "Qua boss không sai câu nào",
    test: (s) => s.perfectBoss,
  },
  {
    id: "promoted-junior",
    icon: "🎖️",
    title: { en: "Promoted: Junior", vi: "Thăng chức: Junior" },
    desc: "Lên Junior",
    test: (s) => s.rank !== "intern",
  },
  {
    id: "early-bird",
    icon: "🌅",
    title: { en: "Early Bird", vi: "Early Bird" },
    desc: "Học trước 7 giờ sáng",
    test: (s) => s.hourIct < 7,
  },
  {
    id: "night-owl",
    icon: "🦉",
    title: { en: "Night Owl", vi: "Night Owl" },
    desc: "Học sau 23 giờ",
    test: (s) => s.hourIct >= 23,
  },
];

async function stats(db: SupabaseClient, userId: string): Promise<Stats> {
  const c = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const head = { count: "exact" as const, head: true };
  const [dialogues, correct, cards, hints, claimed, profile, fixIds, tuanIds, boss] =
    await Promise.all([
      c(
        db
          .from("dialogue_runs")
          .select("id", head)
          .eq("user_id", userId)
          .not("completed_at", "is", null),
      ),
      c(db.from("user_answers").select("id", head).eq("user_id", userId).eq("is_correct", true)),
      c(db.from("user_cards").select("sense_id", head).eq("user_id", userId)),
      c(
        db
          .from("question_deliveries")
          .select("id", head)
          .eq("user_id", userId)
          .eq("hint_used", true),
      ),
      c(
        db
          .from("user_quests")
          .select("quest_key", head)
          .eq("user_id", userId)
          .not("claimed_at", "is", null),
      ),
      db.from("profiles").select("streak_current, rank").eq("id", userId).single(),
      db.from("questions").select("id").eq("type", "error_correction"),
      db.from("questions").select("id").eq("npc_id", "tuan"),
      db
        .from("quiz_sessions")
        .select("correct_count, planned_count")
        .eq("user_id", userId)
        .eq("kind", "boss")
        .not("finished_at", "is", null),
    ]);
  const inIds = async (ids: { id: string }[] | null) =>
    ids?.length
      ? c(
          db
            .from("user_answers")
            .select("id", head)
            .eq("user_id", userId)
            .eq("is_correct", true)
            .in(
              "question_id",
              ids.map((i) => i.id),
            ),
        )
      : 0;
  const hourIct = (new Date().getUTCHours() + 7) % 24;
  return {
    dialogues,
    correct,
    cards,
    hints,
    questsClaimed: claimed,
    streak: profile.data?.streak_current ?? 0,
    rank: profile.data?.rank ?? "intern",
    correctFix: await inIds(fixIds.data),
    correctTuan: await inIds(tuanIds.data),
    perfectBoss: (boss.data ?? []).some((b) => b.correct_count === b.planned_count),
    hourIct,
  };
}

export type ProgressEvent =
  | { type: "answer"; correct: boolean; questionType?: string; npcId?: string | null }
  | { type: "word_learned"; count?: number }
  | { type: "review_done" }
  | { type: "dialogue_complete"; npcId: string }
  | { type: "xp"; amount: number }
  | { type: "session_activity" };

export interface ProgressUpdate {
  quests: { key: string; progress: number; goal: number; completed: boolean }[];
  achievements: { id: string; icon: string; title: string }[];
}

/** Server-side reaction to a learner event: quest progress + newly unlocked achievements. */
export async function recordEvent(
  db: SupabaseClient,
  userId: string,
  events: ProgressEvent[],
): Promise<ProgressUpdate> {
  const { data: p } = await db.from("profiles").select("timezone").eq("id", userId).single();
  await ensureQuests(db, userId, p?.timezone ?? "Asia/Ho_Chi_Minh");
  const bumps: [string, number][] = [];
  for (const e of events) {
    if (e.type === "answer" && e.correct) {
      bumps.push(["answer_correct", 1]);
      if (e.questionType === "listening") bumps.push(["listen_correct", 1]);
    }
    if (e.type === "word_learned") bumps.push(["learn_words", e.count ?? 1]);
    if (e.type === "review_done") bumps.push(["review_cards", 1]);
    if (e.type === "dialogue_complete") bumps.push([`talk_to:${e.npcId}`, 1]);
    if (e.type === "xp" && e.amount > 0) bumps.push(["weekly_xp", e.amount]);
  }
  const quests: ProgressUpdate["quests"] = [];
  for (const [key, amount] of bumps) {
    const { data } = await db.rpc("svc_bump_quest", {
      p_user: userId,
      p_key: key,
      p_amount: amount,
    });
    for (const q of (data ?? []) as {
      quest_key: string;
      progress: number;
      goal: number;
      completed_at: string | null;
    }[]) {
      quests.push({
        key: q.quest_key,
        progress: q.progress,
        goal: q.goal,
        completed: !!q.completed_at,
      });
    }
  }

  const s = await stats(db, userId);
  const { data: have } = await db
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);
  const owned = new Set((have ?? []).map((a) => a.achievement_id));
  const unlocked = ACHIEVEMENTS.filter((a) => !owned.has(a.id) && a.test(s));
  for (const a of unlocked) {
    const { error } = await db
      .from("user_achievements")
      .insert({ user_id: userId, achievement_id: a.id });
    if (!error) {
      await db.rpc("svc_award_xp", {
        p_user: userId,
        p_amount: 20,
        p_reason: "achievement_reward",
        p_key: `achievement:${a.id}`,
        p_ref_type: "achievement",
        p_ref_id: a.id,
        p_coins: 10,
      });
    }
  }
  return {
    quests,
    achievements: unlocked.map((a) => ({ id: a.id, icon: a.icon, title: a.title.vi })),
  };
}
