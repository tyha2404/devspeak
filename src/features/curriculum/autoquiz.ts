import type { QuestionSpec, SenseSpec } from "@/features/content/curated";
import type { GrammarBody } from "./schema";

// Questions generated from lesson content at seed time, so study-track tests have the same shape
// as ForumFlash's (16 questions) while answers stay in the server-side question bank.

export const TRACK_TEST_SIZE = 16;

/** Rotate a fixed-size test through the full bank, advancing only after a finished attempt. */
export function vocabQuestionSelection<T>(bank: T[], completedAttempts: number): T[] {
  if (bank.length <= TRACK_TEST_SIZE) return [...bank];
  const start = (completedAttempts * TRACK_TEST_SIZE) % bank.length;
  return Array.from({ length: TRACK_TEST_SIZE }, (_, i) => bank[(start + i) % bank.length]!);
}

const byText = (a: string, b: string) => a.localeCompare(b, "vi");

/** Options sorted alphabetically (so position never hints at the answer); returns the answer index. */
function choice(correct: string, distractors: string[]) {
  const options = [...new Set([correct, ...distractors])].slice(0, 4).sort(byText);
  return { options, answer: options.indexOf(correct) };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The example sentence with the term (or one of its forms) blanked out, or null if it isn't there. */
export function blankTerm(sentence: string, forms: string[]): string | null {
  for (const f of [...forms].sort((a, b) => b.length - a.length)) {
    const words = f
      .trim()
      .split(/\s+/)
      .filter((w) => !/^(a|an|the)$/i.test(w))
      .map(escapeRe);
    if (!words.length) continue;
    // Articles may differ and up to two words may sit inside a phrase ("meet the deadline").
    const re = new RegExp(`\\b${words.join("\\s+(?:\\w+\\s+){0,2}")}\\b`, "i");
    if (re.test(sentence)) return sentence.replace(re, "___");
  }
  return null;
}

/**
 * A question bank over a word set, cycling four kinds like ForumFlash: term → meaning,
 * meaning → term, type the term for a meaning, and pick the term that completes an example.
 * Distractors are the next words of the same set.
 */
export function vocabTest(lessonSlug: string, words: SenseSpec[], size = TRACK_TEST_SIZE) {
  if (words.length < 4) throw new Error(`${lessonSlug}: a vocabulary test needs at least 4 words`);
  const out: QuestionSpec[] = [];
  const used = new Set<string>();
  for (let n = 0; n < size; n++) {
    const w = words[n % words.length]!;
    const others = Array.from(
      { length: words.length - 1 },
      (_, k) => words[(n + k + 1) % words.length]!,
    );
    const base = {
      slug: `auto-${lessonSlug}-${n + 1}`,
      cefr: w.cefr,
      topic: w.topic,
      senses: [w.slug],
      explanation_vi: `“${w.lemma}” nghĩa là “${w.vi}”. Ví dụ: ${w.examples[0]!.en}`,
    };
    // Prefer the planned kind, else one this word hasn't had yet; kind 3 needs an example
    // that contains the term. The kind actually emitted is what gets recorded.
    const blanked = blankTerm(w.examples[0]!.en, [w.lemma, ...w.forms]);
    const order = [0, 1, 2, 3].map((k) => (n + k) % 4).filter((k) => k !== 3 || blanked);
    const kind = order.find((k) => !used.has(`${w.slug}:${k}`)) ?? order[0]!;
    used.add(`${w.slug}:${kind}`);
    if (kind === 2) {
      out.push({
        ...base,
        type: "fill_blank",
        skin: "slack",
        context: `Nhập mục từ có nghĩa: “${w.vi}”`,
        sentence: "___",
        accepted: [w.lemma, ...w.forms],
      });
      continue;
    }
    if (kind === 3 && blanked) {
      const c = choice(
        w.lemma,
        others.map((o) => o.lemma),
      );
      out.push({ ...base, type: "fill_blank", skin: "slack", sentence: blanked, ...c });
    } else if (kind === 0) {
      const c = choice(
        w.vi,
        others.map((o) => o.vi),
      );
      out.push({
        ...base,
        type: "mcq_meaning",
        skin: "flashcard",
        stem: `“${w.lemma}”`,
        question: "có nghĩa là gì?",
        ...c,
      });
    } else {
      const c = choice(
        w.lemma,
        others.map((o) => o.lemma),
      );
      out.push({
        ...base,
        type: "mcq_meaning",
        skin: "flashcard",
        stem: `“${w.vi}”`,
        question: "Mục từ nào tương ứng với nghĩa này?",
        ...c,
      });
    }
  }
  return out;
}

/** Use authored mistakes only when their complete correction matches this exact example. */
export function mutations(sentence: string, fixes: GrammarBody["contrast"]["fixes"] = []) {
  return [
    ...new Set(
      fixes
        .filter((fix) => fix.right === sentence && fix.wrong !== sentence)
        .map((fix) => fix.wrong),
    ),
  ];
}

/** "Read the Vietnamese, pick the English" items built from a grammar lesson's examples. */
export function grammarTranslations(lessonSlug: string, cefr: SenseSpec["cefr"], g: GrammarBody) {
  return g.examples.flatMap((e, i): QuestionSpec[] => {
    const wrong = mutations(e.en, g.contrast.fixes);
    const fallback = g.examples.filter((x) => x.en !== e.en && x.vi !== e.vi).map((x) => x.en);
    const distractors = [...wrong, ...fallback].slice(0, 3);
    if (distractors.length < 2) return [];
    return [
      {
        slug: `auto-${lessonSlug}-tr-${i + 1}`,
        type: "mcq_meaning",
        skin: "flashcard",
        cefr,
        topic: "grammar",
        senses: [],
        stem: e.vi,
        question: "Đọc câu tiếng Việt, rồi chọn câu tiếng Anh đúng nghĩa và đúng cấu trúc.",
        explanation_vi: e.note,
        ...choice(e.en, distractors),
      },
    ];
  });
}

/**
 * A grammar test in ForumFlash's order: five authored items (basics), five more (applied),
 * up to six translations (context), then whatever remains, capped at 16.
 */
export function grammarTestOrder(authored: string[], translations: string[]) {
  const order = [
    ...authored.slice(0, 5),
    ...authored.slice(5, 10),
    ...translations.slice(0, 6),
    ...authored.slice(10),
    ...translations.slice(6),
  ];
  return [...new Set(order)].slice(0, TRACK_TEST_SIZE);
}
