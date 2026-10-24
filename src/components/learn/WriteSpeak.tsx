"use client";

import { useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const C =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition;
  return C ? new C() : null;
}

/** Free-text reply (PR comment, email); graded on the server. */
export function FreeWrite({
  onSubmit,
  busy,
  placeholder,
}: {
  onSubmit: (t: string) => void;
  busy: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
      className="space-y-2"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 600))}
        rows={3}
        placeholder={placeholder ?? "Viết câu trả lời bằng tiếng Anh…"}
        aria-label="Câu trả lời"
        className="border-line bg-surface w-full rounded border p-2"
      />
      <button
        disabled={busy || !text.trim()}
        className="bg-ink text-paper rounded px-4 py-1.5 text-sm disabled:opacity-40"
      >
        Gửi
      </button>
    </form>
  );
}

/** Speak with the mic (Web Speech API where available); always offers a typed fallback. */
export function Speak({
  phrases,
  onSubmit,
  busy,
}: {
  phrases: string[];
  onSubmit: (t: string) => void;
  busy: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState(false);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const supported = typeof window !== "undefined" && !!getRecognition();

  const start = () => {
    const r = getRecognition();
    if (!r) return setTyped(true);
    rec.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e) =>
      setTranscript(
        Array.from(e.results)
          .map((x) => x[0]!.transcript)
          .join(" "),
      );
    r.onend = () => setListening(false);
    r.onerror = () => {
      setListening(false);
      setTyped(true);
    };
    setListening(true);
    r.start();
  };

  return (
    <div className="space-y-2">
      {phrases.length > 0 && (
        <p className="text-muted text-xs">Gợi ý ý chính: {phrases.join(" · ")}</p>
      )}
      {!typed && supported && (
        <button
          onClick={() => (listening ? rec.current?.stop() : start())}
          className={`rounded px-4 py-2 text-sm font-semibold text-white ${listening ? "bg-bad" : "bg-merged"}`}
        >
          {listening ? "⏹ Dừng" : "🎙️ Nói"}
        </button>
      )}
      {(typed || !supported) && (
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value.slice(0, 600))}
          rows={2}
          aria-label="Gõ câu nói của bạn"
          placeholder="Không dùng micro? Gõ câu bạn muốn nói…"
          className="border-line bg-surface w-full rounded border p-2"
        />
      )}
      {!typed && supported && transcript && (
        <p className="bg-paper rounded p-2 text-sm">“{transcript}”</p>
      )}
      <div className="flex gap-2">
        <button
          disabled={busy || !transcript.trim() || listening}
          onClick={() => onSubmit(transcript.trim())}
          className="bg-ink text-paper rounded px-4 py-1.5 text-sm disabled:opacity-40"
        >
          Gửi
        </button>
        {!typed && supported && (
          <button onClick={() => setTyped(true)} className="text-xs underline">
            Không nói được lúc này? Gõ thay
          </button>
        )}
      </div>
    </div>
  );
}
