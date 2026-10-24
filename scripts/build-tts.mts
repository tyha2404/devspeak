/**
 * Pre-generates speech for every word and example sentence (plus any listening items) into
 * public/audio/<key>.m4a + manifest.json. Incremental: existing files are kept.
 *
 * Provider: macOS `say` + `afconvert` (local/dev). Apple's system voices are licensed for personal use, so for a
 * public launch set TTS_PROVIDER to a commercially licensed service and regenerate (see docs/LAUNCH.md).
 *
 * Usage: pnpm tts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { stripMarkup } from "../src/lib/markup";
import { ttsKey } from "../src/lib/ttsKey";
import { loadCurated } from "./lib/curated";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/audio");
const VOICE: Record<string, string> = {
  "en-US": "Samantha",
  "en-GB": "Daniel",
  "en-AU": "Karen",
  "en-IN": "Rishi",
};

if ((process.env.TTS_PROVIDER ?? "say") !== "say")
  throw new Error(`TTS provider ${process.env.TTS_PROVIDER} not configured`);
if (process.platform !== "darwin") {
  console.log("skip: the `say` provider needs macOS; the app falls back to Web Speech");
  process.exit(0);
}

const lines = new Map<string, { voice: string; text: string }>();
const add = (voice: string, text: string) => {
  const t = stripMarkup(text).trim();
  if (t) lines.set(ttsKey(voice, t), { voice, text: t });
};

const c = loadCurated();
for (const s of c.senses) {
  add("en-US", s.lemma);
  for (const e of s.examples) add("en-US", e.en);
}
for (const q of c.questions) {
  if (q.type !== "listening") continue;
  if (q.script) for (const l of q.script) add(l.voice, l.text);
  else add(q.voice, q.tts);
}

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dq-tts-"));
let made = 0;
for (const [key, { voice, text }] of lines) {
  const file = path.join(OUT, `${key}.m4a`);
  if (fs.existsSync(file)) continue;
  const aiff = path.join(tmp, `${key}.aiff`);
  const say = spawnSync("say", ["-v", VOICE[voice] ?? "Samantha", "-r", "165", "-o", aiff, text]);
  if (say.status !== 0) throw new Error(`say failed for "${text}"`);
  const conv = spawnSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "32000", aiff, file]);
  if (conv.status !== 0) throw new Error(`afconvert failed for "${text}"`);
  made++;
}
fs.rmSync(tmp, { recursive: true, force: true });
const keys = [...lines.keys()].filter((k) => fs.existsSync(path.join(OUT, `${k}.m4a`))).sort();
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(keys));
console.log(`tts: ${lines.size} lines, ${made} generated, ${keys.length} in manifest`);
