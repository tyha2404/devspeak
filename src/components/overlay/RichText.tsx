"use client";

import { useEffect, useMemo, useState } from "react";
import { parseMarkup } from "@/lib/markup";
import { useGlossary } from "@/stores/glossaryStore";
import { sfx } from "@/lib/client/sfx";
import { useSettings } from "@/stores/settingsStore";

/**
 * Text with tappable vocabulary ([[surface|slug]]) and an optional typewriter reveal.
 * The full text is laid out from the start (unrevealed characters are transparent), so the
 * box never jumps. Unrevealed text is aria-hidden; word buttons stay reachable.
 */
export function RichText({
  text,
  typewriter = false,
  onDone,
  className,
  blipPitch = 1,
}: {
  text: string;
  typewriter?: boolean;
  blipPitch?: number;
  onDone?: () => void;
  className?: string;
}) {
  const tokens = useMemo(() => parseMarkup(text), [text]);
  const total = tokens.reduce((n, t) => n + t.text.length, 0);
  const cps = useSettings((s) => (s.reducedMotion ? 0 : s.typewriterCps));
  const [shown, setShown] = useState(typewriter && cps > 0 ? 0 : total);
  const show = useGlossary((s) => s.show);
  const known = useGlossary((s) => s.entries);

  useEffect(() => {
    if (!typewriter || cps === 0) {
      setShown(total);
      onDone?.();
      return;
    }
    setShown(0);
    const start = performance.now();
    let last = 0;
    let raf = 0;
    const tick = () => {
      const n = Math.min(total, Math.floor(((performance.now() - start) / 1000) * cps));
      if (n !== last && n % 2 === 0) sfx.blip(blipPitch);
      last = n;
      setShown(n);
      if (n < total) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, typewriter, cps, total]);

  let offset = 0;
  return (
    <span className={className}>
      <span>
        {tokens.map((t, i) => {
          const start = offset;
          offset += t.text.length;
          const visible = Math.max(0, Math.min(t.text.length, shown - start));
          const content = (
            <>
              {t.text.slice(0, visible)}
              <span className="text-transparent" aria-hidden>
                {t.text.slice(visible)}
              </span>
            </>
          );
          if (!t.sense) return <span key={i}>{content}</span>;
          const has = !!known[t.sense];
          return (
            <button
              key={i}
              type="button"
              disabled={!has || visible < t.text.length}
              onClick={() => show(t.sense!)}
              className="pointer-events-auto rounded-sm font-semibold text-[#2667cc] underline decoration-dotted underline-offset-4 hover:bg-[#2667cc]/10 disabled:cursor-default"
            >
              {content}
            </button>
          );
        })}
      </span>
    </span>
  );
}
