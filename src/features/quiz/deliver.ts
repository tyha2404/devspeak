import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { audioUrl, ttsKey } from "@/lib/ttsKey";
import type { Option, StoredPrompt } from "./types";

export type ClientPrompt = StoredPrompt;

type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const opaqueId = () => randomBytes(4).toString("hex");

let audioKeys: Set<string> | null = null;
/** Keys of pre-generated speech (public/audio/manifest.json), loaded once per server instance. */
export function audioManifest() {
  if (!audioKeys) {
    try {
      audioKeys = new Set(
        JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/audio/manifest.json"), "utf8")),
      );
    } catch {
      audioKeys = new Set();
    }
  }
  return audioKeys;
}

/**
 * Build what the learner sees for one delivery: options and tokens shuffled and renamed to
 * opaque ids, plus the map back to canonical ids. The canonical order of `sentence_order`
 * tokens *is* the answer, so shuffling is not optional there.
 */
export function buildClientPrompt(
  prompt: StoredPrompt,
  rng: Rng = Math.random,
  makeId: () => string = opaqueId,
  /** Exam mode lists choices alphabetically instead of shuffling them. */
  alphabetical = false,
) {
  const optionMap: Record<string, string> = {};
  const rename = (list: Option[], doShuffle: boolean) => {
    const ordered = !doShuffle
      ? list
      : alphabetical
        ? [...list].sort((a, b) => a.text.localeCompare(b.text, "vi"))
        : shuffle(list, rng);
    const out = ordered.map((o) => {
      const id = makeId();
      optionMap[id] = o.id;
      return { id, text: o.text };
    });
    return out;
  };

  let client: ClientPrompt;
  switch (prompt.type) {
    case "sentence_order": {
      let tokens = rename(prompt.tokens, true);
      // Never hand out the solution by accident.
      if (tokens.length > 1 && tokens.every((t, i) => optionMap[t.id] === `t${i}`))
        tokens = [...tokens.slice(1), tokens[0]!];
      client = { ...prompt, tokens };
      break;
    }
    case "error_correction":
      client = {
        ...prompt,
        tokens: rename(prompt.tokens, false),
        options: rename(prompt.options, true),
      };
      break;
    case "fill_blank":
      client = { ...prompt, options: prompt.options && rename(prompt.options, true) };
      break;
    case "listening": {
      client = { ...prompt, options: rename(prompt.options, true) };
      if (prompt.dictation) {
        // Dictation: the spoken text is the answer, so only an opaque audio URL may reach the browser.
        const key = ttsKey(prompt.voice, prompt.tts);
        if (audioManifest().has(key)) client = { ...client, tts: "", audio: audioUrl(key) };
      }
      break;
    }
    default:
      client = { ...prompt, options: rename(prompt.options, true) };
  }
  return { client, optionMap };
}
