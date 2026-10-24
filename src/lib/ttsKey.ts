// Content key for pre-generated speech, identical in Node and the browser (sync 64-bit FNV-1a).
export function ttsKey(voice: string, text: string) {
  let h = 0xcbf29ce484222325n;
  for (const ch of `${voice}|${text.trim()}`) {
    h ^= BigInt(ch.codePointAt(0)!);
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

export const audioUrl = (key: string) => `/audio/${key}.m4a`;
