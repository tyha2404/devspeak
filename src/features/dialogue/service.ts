import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DialogueNode, Effect } from "@/features/content/curated";
import { createSession, questionIdsBySlug } from "@/features/quiz/service";
import type { DialogueStep, GlossEntry } from "@/lib/contracts/dialogue";
import { advance, graphSenses, scoreSpeech, stripNode, type Graph } from "./engine";
import { gradeWriting } from "./grading";

export class DialogueError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "LOCKED" | "BAD_CHOICE" | "QUIZ_NOT_FINISHED" | "ALREADY_DONE",
    message: string,
  ) {
    super(message);
  }
}

interface DialogueRow {
  id: string;
  slug: string;
  npc_id: string;
  title_en: string;
  title_vi: string;
  version: number;
  graph: Graph;
  xp_reward: number;
  unlock_level: number;
}

interface RunRow {
  id: string;
  user_id: string;
  dialogue_id: string;
  dialogue_version: number;
  current_node: string;
  path: unknown[];
  quiz_session_id: string | null;
  completed_at: string | null;
}

export async function glossary(
  db: SupabaseClient,
  slugs: string[],
): Promise<Record<string, GlossEntry>> {
  if (!slugs.length) return {};
  const { data, error } = await db
    .from("senses")
    .select(
      "slug, definition_en, meaning_vi, vi_usage_note, lexemes(display, pos, ipa), examples(text_en, text_vi)",
    )
    .in("slug", slugs)
    .eq("review_status", "published");
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((s) => {
      const lex = s.lexemes as unknown as { display: string; pos: string; ipa: string | null };
      const ex = (s.examples as unknown as { text_en: string; text_vi: string | null }[])[0];
      return [
        s.slug,
        {
          slug: s.slug,
          lemma: lex.display,
          pos: lex.pos,
          ipa: lex.ipa,
          vi: s.meaning_vi,
          def: s.definition_en,
          note: s.vi_usage_note,
          example: ex ? { en: ex.text_en, vi: ex.text_vi } : null,
        } satisfies GlossEntry,
      ];
    }),
  );
}

async function applyEffects(db: SupabaseClient, userId: string, effects: Effect[]) {
  const learned: string[] = [];
  for (const e of effects) {
    if (e.type !== "learnWord") continue; // setFlag lands with quests (M4)
    const { data: sense } = await db.from("senses").select("id").eq("slug", e.sense).maybeSingle();
    if (!sense) continue;
    const { data } = await db.rpc("svc_add_card", {
      p_user: userId,
      p_sense: sense.id,
      p_via: "dialogue",
    });
    if (data) learned.push(e.sense);
  }
  return learned;
}

/** Build the client view of a node, creating the quiz session when the run enters a quiz node. */
async function viewNode(db: SupabaseClient, userId: string, d: DialogueRow, run: RunRow) {
  const node = d.graph.nodes[run.current_node] as DialogueNode;
  if (node.type !== "quiz") return stripNode(run.current_node, node);
  let sessionId = run.quiz_session_id;
  if (!sessionId) {
    const ids = await questionIdsBySlug(db, node.questions);
    const session = await createSession(db, userId, {
      kind: "npc",
      npcId: d.npc_id,
      questionIds: ids,
    });
    sessionId = session.id;
    await db.from("dialogue_runs").update({ quiz_session_id: sessionId }).eq("id", run.id);
  }
  return stripNode(run.current_node, node, { sessionId });
}

/** Start (or resume) the next dialogue for an NPC: first not completed, otherwise the latest. */
export async function startDialogue(
  db: SupabaseClient,
  userId: string,
  npcId: string,
  level: number,
): Promise<DialogueStep> {
  const { data: list, error } = await db
    .from("dialogues")
    .select("id, slug, npc_id, title_en, title_vi, version, graph, xp_reward, unlock_level")
    .eq("npc_id", npcId)
    .eq("status", "published")
    .lte("unlock_level", level)
    .order("sort_order");
  if (error) throw error;
  const dialogues = (list ?? []) as DialogueRow[];
  if (!dialogues.length) throw new DialogueError("NOT_FOUND", "Nothing to talk about yet");

  const { data: runs } = await db
    .from("dialogue_runs")
    .select(
      "id, user_id, dialogue_id, dialogue_version, current_node, path, quiz_session_id, completed_at",
    )
    .eq("user_id", userId)
    .in(
      "dialogue_id",
      dialogues.map((d) => d.id),
    )
    .order("started_at", { ascending: false });
  const done = new Set((runs ?? []).filter((r) => r.completed_at).map((r) => r.dialogue_id));
  const d = dialogues.find((x) => !done.has(x.id)) ?? dialogues[dialogues.length - 1]!;

  let run = (runs ?? []).find(
    (r) => r.dialogue_id === d.id && !r.completed_at && r.dialogue_version === d.version,
  ) as RunRow | undefined;
  if (!run) {
    const { data, error: insErr } = await db
      .from("dialogue_runs")
      .insert({
        user_id: userId,
        dialogue_id: d.id,
        dialogue_version: d.version,
        current_node: d.graph.entry,
      })
      .select(
        "id, user_id, dialogue_id, dialogue_version, current_node, path, quiz_session_id, completed_at",
      )
      .single();
    if (insErr) throw insErr;
    run = data as RunRow;
  }
  return {
    runId: run.id,
    title: { en: d.title_en, vi: d.title_vi },
    node: await viewNode(db, userId, d, run),
    glossary: await glossary(db, graphSenses(d.graph)),
    done: false,
  };
}

export async function advanceDialogue(
  db: SupabaseClient,
  userId: string,
  runId: string,
  choiceId?: string,
  text?: string,
): Promise<DialogueStep> {
  const { data: runData } = await db
    .from("dialogue_runs")
    .select(
      "id, user_id, dialogue_id, dialogue_version, current_node, path, quiz_session_id, completed_at",
    )
    .eq("id", runId)
    .maybeSingle();
  const run = runData as RunRow | null;
  if (!run || run.user_id !== userId)
    throw new DialogueError("NOT_FOUND", "Conversation not found");
  if (run.completed_at) throw new DialogueError("ALREADY_DONE", "Conversation already finished");
  const { data: dData } = await db
    .from("dialogues")
    .select("id, slug, npc_id, title_en, title_vi, version, graph, xp_reward, unlock_level")
    .eq("id", run.dialogue_id)
    .single();
  const d = dData as DialogueRow;

  let quiz: { finished: boolean; correct: number } | undefined;
  if (run.quiz_session_id) {
    const { data: s } = await db
      .from("quiz_sessions")
      .select("finished_at, correct_count")
      .eq("id", run.quiz_session_id)
      .single();
    quiz = { finished: !!s?.finished_at, correct: s?.correct_count ?? 0 };
  }

  const result = advance(d.graph, run.current_node, { choiceId, quiz, text });
  if (!result.ok)
    throw new DialogueError(
      result.error === "TEXT_REQUIRED" ? "BAD_CHOICE" : result.error,
      result.error,
    );
  const here = d.graph.nodes[run.current_node] as DialogueNode;
  let feedback = result.feedback as DialogueStep["feedback"];
  if (here.type === "speak") {
    const s = scoreSpeech(text!, here.expected);
    feedback = {
      quality: s.quality,
      vi: s.missing.length
        ? `Bạn đã nói được ${s.hits.length}/${here.expected.length} ý chính. Thử thêm: ${s.missing.join(", ")}.`
        : "Tuyệt! Bạn đã nói đủ các ý chính.",
    };
  } else if (here.type === "freewrite") {
    const g = await gradeWriting(db, userId, here.task_en, here.context, here.keywords, text!);
    feedback = {
      quality: g.score >= 2 ? "best" : g.score === 1 ? "ok" : "poor",
      vi: g.feedback_vi,
      fixes: g.grammar_fixes,
      better: g.better_version || undefined,
    };
  }

  const learned = await applyEffects(db, userId, result.effects);
  const nextNode = d.graph.nodes[result.next] as DialogueNode;
  const path = [
    ...run.path,
    {
      node: run.current_node,
      choice: choiceId,
      quality: feedback?.quality,
      text: text?.slice(0, 600),
    },
  ];
  // Leaving a quiz node clears its session so a retry loop starts a fresh one.
  const update: Partial<RunRow> & { path: unknown[] } = {
    current_node: result.next,
    path,
    quiz_session_id: null,
  };

  let rewards: DialogueStep["rewards"];
  if (nextNode.type === "end") {
    learned.push(...(await applyEffects(db, userId, nextNode.effects)));
    update.completed_at = new Date().toISOString();
    const { data: award } = await db.rpc("svc_award_xp", {
      p_user: userId,
      p_amount: d.xp_reward,
      p_reason: "dialogue_complete",
      p_key: `dialogue:${d.id}:v${d.version}`,
      p_ref_type: "dialogue",
      p_ref_id: d.slug,
      p_coins: 5,
    });
    const a = award as {
      duplicate: boolean;
      xp_total: number;
      level: number;
      leveled_up?: boolean;
      coins?: number;
    };
    rewards = {
      xp: a.duplicate ? 0 : d.xp_reward,
      leveledUp: !!a.leveled_up,
      level: a.level,
      xpTotal: a.xp_total,
      coins: a.coins ?? 0,
      wordsLearned: learned,
    };
  }
  const { error: upErr } = await db.from("dialogue_runs").update(update).eq("id", run.id);
  if (upErr) throw upErr;

  const updated = { ...run, ...update } as RunRow;
  return {
    runId: run.id,
    title: { en: d.title_en, vi: d.title_vi },
    node: await viewNode(db, userId, d, updated),
    glossary: {},
    feedback,
    done: nextNode.type === "end",
    rewards,
  };
}
