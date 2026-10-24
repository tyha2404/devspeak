import { useSettings } from "@/stores/settingsStore";

// Tiny WebAudio blips: no audio files to download, respects the SFX volume setting.
let ctx: AudioContext | null = null;

function tone(freq: number, ms: number, type: OscillatorType = "square", gain = 0.06) {
  const vol = useSettings.getState().sfxVolume;
  if (!vol || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain * vol;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {
    // Audio blocked until a user gesture; ignore.
  }
}

export const sfx = {
  correct: () => {
    tone(660, 90, "triangle");
    setTimeout(() => tone(990, 140, "triangle"), 90);
  },
  wrong: () => tone(180, 220, "sawtooth", 0.04),
  levelUp: () =>
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 120, "triangle"), i * 110)),
};
