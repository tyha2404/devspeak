// Daily word picker (pure). The service materialises the result per (user, ICT day) so the set is stable.

export interface Candidate {
  senseId: number;
  topic: string;
  cefr: string;
  isIt: boolean;
  rank: number | null; // NGSL rank (lower = more frequent)
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const CONFUSABLE = [
  ["affect", "effect"],
  ["lose", "loose"],
  ["advice", "advise"],
];

/** Deterministic PRNG so a user's set for a day is reproducible. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function newWordCount(dueReviews: number) {
  if (dueReviews > 120) return 0;
  if (dueReviews > 60) return 3;
  return 5;
}

export function selectWords(opts: {
  candidates: Candidate[];
  userLevel: string;
  seed: string;
  count: number;
  itShare?: number; // IT terms per 5 words (default 3)
  focusTopics?: string[];
  lemmas?: Map<number, string>;
}): number[] {
  const lvl = LEVELS.indexOf(opts.userLevel);
  const rand = seeded(opts.seed);
  const itTarget = Math.round(((opts.itShare ?? 3) / 5) * opts.count);
  const eligible = opts.candidates.filter((c) => {
    const i = LEVELS.indexOf(c.cefr);
    return i >= 0 && i <= lvl + 1 && i >= lvl - 1;
  });
  const score = (c: Candidate) => {
    const topic = opts.focusTopics?.includes(c.topic) ? 1 : 0;
    const freq = c.rank === null ? 0.3 : Math.max(0, 1 - c.rank / 3000);
    const fit = LEVELS.indexOf(c.cefr) === lvl ? 1 : 0.5;
    return 0.4 * topic + 0.3 * freq + 0.2 * fit + 0.1 * rand();
  };
  const ranked = eligible.map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s);

  const picked: Candidate[] = [];
  let stretch = 0;
  const topicCount = new Map<string, number>();
  const take = (pred: (c: Candidate) => boolean, limit: number) => {
    for (const { c } of ranked) {
      if (picked.length >= opts.count || picked.filter(pred).length >= limit) break;
      if (!pred(c) || picked.includes(c)) continue;
      if ((topicCount.get(c.topic) ?? 0) >= 2) continue;
      const above = LEVELS.indexOf(c.cefr) > lvl;
      if (above && stretch >= 1) continue; // one "stretch" word above level per day
      const lemma = opts.lemmas?.get(c.senseId);
      if (
        lemma &&
        picked.some((p) =>
          CONFUSABLE.some(
            (pair) => pair.includes(lemma) && pair.includes(opts.lemmas!.get(p.senseId) ?? ""),
          ),
        )
      )
        continue;
      picked.push(c);
      if (above) stretch++;
      topicCount.set(c.topic, (topicCount.get(c.topic) ?? 0) + 1);
    }
  };
  take((c) => c.isIt, itTarget);
  take(() => true, opts.count); // fill the rest (general words first get a chance via scores)
  return picked.map((c) => c.senseId);
}
