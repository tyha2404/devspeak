// Speech: pre-generated audio (pnpm tts → /audio/<key>.m4a) when available, Web Speech otherwise.
import { audioUrl, ttsKey } from "@/lib/ttsKey";

let voices: SpeechSynthesisVoice[] = [];
let manifest: Set<string> | null = null;
let manifestLoading: Promise<void> | null = null;
let current: HTMLAudioElement | null = null;

function loadVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis.getVoices();
}
if (typeof window !== "undefined") {
  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
  }
  manifestLoading = fetch("/audio/manifest.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((keys: string[]) => {
      manifest = new Set(keys);
    })
    .catch(() => {
      manifest = new Set();
    });
}

export const ttsAvailable = () =>
  typeof window !== "undefined" && ("speechSynthesis" in window || !!manifest?.size);

/** Stop whatever is playing (audio element or Web Speech). */
function stopMedia() {
  current?.pause();
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Stop playback and cancel any meeting script in progress. */
function stopAll() {
  scriptRun++;
  stopMedia();
}

function webSpeech(text: string, lang: string, rate: number, pitch = 1) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  u.voice =
    voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  window.speechSynthesis.speak(u);
  return u;
}

/** Play a pre-generated file directly (dictation sends only its URL). */
export function playUrl(url: string, rate = 0.9) {
  stopMedia();
  const a = new Audio(url);
  a.playbackRate = Math.max(0.5, rate / 0.9);
  current = a;
  void a.play().catch(() => {});
  return a;
}

export function speak(text: string, opts: { lang?: string; rate?: number; pitch?: number } = {}) {
  if (typeof window === "undefined") return false;
  const lang = opts.lang ?? "en-US";
  const rate = opts.rate ?? 0.9;
  stopAll();
  const key = ttsKey(lang, text);
  if (manifest?.has(key)) playUrl(audioUrl(key), rate);
  else webSpeech(text, lang, rate, opts.pitch);
  return true;
}

let scriptRun = 0;

/** Play lines one after another, each in its own voice (meeting minutes). A new call cancels the old one. */
export async function speakScript(lines: { voice: string; text: string }[], rate = 0.9) {
  if (typeof window === "undefined") return false;
  stopAll();
  await manifestLoading;
  const run = ++scriptRun;
  const next = (i: number) => {
    if (run !== scriptRun || i >= lines.length) return;
    const l = lines[i]!;
    const key = ttsKey(l.voice, l.text);
    if (manifest?.has(key)) playUrl(audioUrl(key), rate).onended = () => next(i + 1);
    else {
      const u = webSpeech(l.text, l.voice, rate);
      if (u) u.onend = () => next(i + 1);
    }
  };
  next(0);
  return true;
}

export function stopSpeaking() {
  stopAll();
}
