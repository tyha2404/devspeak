/**
 * AI-drafted content for the study tracks. Writes YAML drafts to content/drafts/ for a human to edit
 * and copy into content/curated or content/curriculum; nothing here touches the database.
 *
 *   pnpm ai:draft vocab-new <topic> [count=10]      new senses for a topic + a lesson stub
 *   pnpm ai:draft vocab-examples <topic>            one or two more examples per existing sense
 *   pnpm ai:draft grammar-examples <level> [lesson] more examples for grammar lessons (a1 … c2)
 *
 * <topic> is the curated file suffix, e.g. "food" for content/curated/vocab/topic-food.yaml.
 * Uses the same provider switch as the pipeline (LLM_FAKE=0, LLM_PROVIDER, GEMINI_FREE_TIER…).
 */
import fs from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { stringify } from "yaml";
import { z } from "zod";
import { getLlm, llmIsFake } from "../src/features/ai/client";
import { MODELS } from "../src/features/ai/pipeline";
import { SenseSpec, type SenseSpec as Sense } from "../src/features/content/curated";
import type { GrammarBody } from "../src/features/curriculum/schema";
import { loadCurated } from "./lib/curated";
import { loadCurriculum } from "./lib/curriculum";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "content/drafts");

const RULES = `You draft content for DevSpeak, an app that teaches English to Vietnamese adults by topic
and by CEFR level (A1–C2). Write natural, modern English and natural Vietnamese (not word-for-word).
Vary situations, speakers and sentence patterns; use common Vietnamese or international first names.
No real company or product names, politics, religion, stereotypes, profanity or personal data.
Do not copy dictionary or textbook sentences: every sentence must be original.`;

const Example = z.object({ en: z.string(), vi: z.string() });

const NewSenses = z.object({
  set_title: z.object({ en: z.string(), vi: z.string() }).describe("Title of the word set"),
  senses: z.array(
    z.object({
      slug: z
        .string()
        .describe("lowercase-hyphen slug ending in the part of speech: -n -v -adj -adv -phr -pv"),
      lemma: z.string(),
      pos: SenseSpec.shape.pos,
      kind: z.enum(["word", "phrasal", "collocation", "phrase"]),
      cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
      ipa: z.string().describe("British IPA between slashes"),
      def: z.string().describe("Simple English definition, max 200 characters"),
      vi: z.string().describe("Short Vietnamese meaning"),
      forms: z.array(z.string()).describe("Inflected forms used in examples, e.g. ordered, orders"),
      examples: z.array(Example).describe("Two examples in different situations"),
    }),
  ),
});

const MoreExamples = z.object({
  items: z.array(z.object({ slug: z.string(), examples: z.array(Example) })),
});

const GrammarExamples = z.object({
  examples: z.array(
    z.object({
      tag: z.string().describe("Which use/form it shows, matching the lesson's existing tags"),
      en: z.string(),
      vi: z.string(),
      note: z.string().describe("One short Vietnamese note on why the structure is used"),
    }),
  ),
});

let calls = 0;
async function ask<T>(schema: z.ZodType<T>, prompt: string, maxTokens = 8000): Promise<T> {
  // The free tier caps requests per minute; pace calls so long runs don't hit 429.
  const rpm = Number(process.env.GEMINI_RPM) || 8;
  if (calls++ > 0 && process.env.GEMINI_FREE_TIER === "1") {
    await new Promise((r) => setTimeout(r, Math.ceil(60_000 / rpm)));
  }
  const params = {
    model: MODELS.gen,
    max_tokens: maxTokens,
    system: RULES,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(schema as z.ZodObject) },
  } as Anthropic.MessageCreateParamsNonStreaming;
  const res = await getLlm().message(params);
  const json = res.text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  return schema.parse(JSON.parse(json));
}

function write(name: string, header: string, data: unknown) {
  fs.mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const file = path.join(OUT, `${name}-${stamp}.yaml`);
  fs.writeFileSync(file, `${header}\n${stringify(data, { lineWidth: 100 })}`);
  console.log(`✓ ${path.relative(ROOT, file)}`);
}

const curated = loadCurated();
const curriculum = loadCurriculum();
const allSlugs = new Set(curated.senses.map((s) => s.slug));
const allLemmas = new Set(curated.senses.map((s) => s.lemma.toLowerCase()));

function topicSenses(topic: string): Sense[] {
  const list = curated.senses.filter((s) => s.topic === topic);
  if (!list.length) throw new Error(`No senses with topic "${topic}" in content/curated/vocab`);
  return list;
}

async function vocabNew(topic: string, count: number) {
  topicSenses(topic); // fails early on an unknown topic
  const unit = curriculum.units.find((u) => u.slug === `topic-${topic}`);
  const sets = unit?.lessons.map((l) => l.title.en) ?? [];
  const out = await ask(
    NewSenses,
    `Topic: ${topic} — "${unit?.title.en ?? topic}" (level around ${unit?.cefr ?? "B1"}).
Existing word sets: ${sets.join("; ")}.
Words already taught (do NOT repeat any of them or their synonyms-as-duplicates):
${[...allLemmas].join(", ")}

Propose ONE new word set of ${count} useful words, phrasal verbs or collocations on a theme within this
topic that the existing sets do not cover. Mix levels around the topic level. Each sense needs two
examples in different situations; no single wrong-word swap may make another correct sentence.`,
  );

  const senses: Sense[] = [];
  const skipped: string[] = [];
  for (const s of out.senses) {
    const parsed = SenseSpec.safeParse({ ...s, topic });
    if (!parsed.success) skipped.push(`${s.slug}: ${z.prettifyError(parsed.error)}`);
    else if (allSlugs.has(s.slug) || allLemmas.has(s.lemma.toLowerCase()))
      skipped.push(`${s.slug}: already exists`);
    else senses.push(parsed.data);
  }
  const next = (unit?.lessons.length ?? 0) + 1;
  write(
    `vocab-${topic}`,
    `# AI draft (${MODELS.gen}) — review before use.\n` +
      `# 1) Append "senses" to content/curated/vocab/topic-${topic}.yaml\n` +
      `# 2) Add "lesson" to content/curriculum/6-vocab/*-${topic}.yaml, then run pnpm seed:content\n` +
      skipped.map((s) => `# skipped ${s}`).join("\n"),
    {
      senses,
      lesson: {
        slug: `${unit?.lessons[0]?.slug.replace(/-l\d+$/, "") ?? topic}-l${next}`,
        kind: "vocab",
        title: {
          en: `Set ${next}: ${out.set_title.en}`,
          vi: `Bộ ${next}: ${out.set_title.vi}`,
        },
        senses: senses.map((s) => s.slug),
        questions: [],
      },
    },
  );
}

async function vocabExamples(topic: string) {
  const senses = topicSenses(topic);
  const items: z.infer<typeof MoreExamples>["items"] = [];
  // Chunks keep each answer short enough for small free-tier output limits.
  for (let i = 0; i < senses.length; i += 12) {
    const chunk = senses.slice(i, i + 12);
    const out = await ask(
      MoreExamples,
      `For each sense below write 2 NEW example sentences (with Vietnamese translations) in situations
different from its current examples. Stay at the sense's CEFR level; use the exact lemma or one of its
forms. Return the same slugs.
${JSON.stringify(chunk.map((s) => ({ slug: s.slug, lemma: s.lemma, pos: s.pos, cefr: s.cefr, def: s.def, vi: s.vi, current: s.examples.map((e) => e.en) })))}`,
    );
    items.push(...out.items.filter((x) => chunk.some((s) => s.slug === x.slug)));
    console.log(`  ${Math.min(i + 12, senses.length)}/${senses.length}`);
  }
  write(
    `examples-${topic}`,
    `# AI draft (${MODELS.gen}) — review, then add the good ones to each sense's "examples"\n` +
      `# in content/curated/vocab/topic-${topic}.yaml. The first example feeds the test: keep it the clearest.`,
    items,
  );
}

async function grammarExamples(level: string, only?: string) {
  const unit = curriculum.units.find((u) => u.kind === "grammar" && u.code === level.toUpperCase());
  if (!unit) throw new Error(`No grammar unit for level ${level}`);
  const lessons = unit.lessons.filter(
    (l): l is typeof l & { grammar: GrammarBody } =>
      l.kind === "grammar" && (!only || l.slug === only),
  );
  if (!lessons.length) throw new Error(`No grammar lesson ${only} in ${unit.code}`);
  const out: Record<string, unknown> = {};
  for (const l of lessons) {
    const g = l.grammar;
    const room = 8 - g.examples.length; // GrammarBody allows at most 8 examples
    const res = await ask(
      GrammarExamples,
      `Grammar point (${unit.code}): ${l.title.en} — ${g.title_vi}
Formulas: ${g.overview.formulas.join(" | ")}
Uses: ${g.functions.map((f) => f.title).join("; ")}
Existing examples: ${JSON.stringify(g.examples.map((e) => ({ tag: e.tag, en: e.en })))}

Write 6 NEW examples (English + natural Vietnamese + short Vietnamese note) covering every use and form,
in varied everyday situations, at ${unit.code} level. Each must be ≤ 15 words. They become "translate
the Vietnamese" test items whose wrong options swap confusable words, so make sure no single swap of
a grammar word (tense, article, preposition, auxiliary) yields another correct sentence.`,
    );
    out[l.slug] = { room_left: room, examples: res.examples };
    console.log(`  ${l.slug}`);
  }
  write(
    `grammar-${unit.code.toLowerCase()}`,
    `# AI draft (${MODELS.gen}) — review. A lesson holds at most 8 examples ("room_left" = free slots);\n` +
      `# swap weaker ones out in content/curriculum/5-grammar/*.yaml, then run pnpm seed:content.`,
    out,
  );
}

const [cmd, a, b] = process.argv.slice(2);
if (llmIsFake()) {
  console.error("LLM is in fake mode: set LLM_FAKE=0 and a provider key in .env.local.");
  process.exit(1);
}
if (cmd === "vocab-new" && a) await vocabNew(a, Number(b) || 10);
else if (cmd === "vocab-examples" && a) await vocabExamples(a);
else if (cmd === "grammar-examples" && a) await grammarExamples(a, b);
else {
  console.error(
    "Usage: pnpm ai:draft vocab-new <topic> [count] | vocab-examples <topic> | grammar-examples <level> [lesson]",
  );
  process.exit(1);
}
