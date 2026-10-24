// Vocabulary markup shared by server and client: "[[surface|sense-slug]]" or "[[slug]]".

export interface MarkupToken {
  text: string;
  sense?: string;
}

const RE = /\[\[([^\]|]+)(?:\|([a-z0-9-]+))?\]\]/g;

export function parseMarkup(text: string): MarkupToken[] {
  const out: MarkupToken[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    const surface = m[1]!;
    out.push({ text: surface, sense: m[2] ?? surface.toLowerCase().replace(/\s+/g, "-") });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export const senseSlugs = (text: string) =>
  parseMarkup(text)
    .map((t) => t.sense)
    .filter((s): s is string => !!s);

export const stripMarkup = (text: string) =>
  parseMarkup(text)
    .map((t) => t.text)
    .join("");
