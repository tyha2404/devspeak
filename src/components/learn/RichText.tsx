import { parseMarkup } from "@/lib/markup";

/** Text that may carry vocabulary markup ([[surface|slug]]): shows the surface words, highlighted. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {parseMarkup(text).map((t, i) =>
        t.sense ? (
          <strong key={i} className="font-semibold">
            {t.text}
          </strong>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </span>
  );
}
