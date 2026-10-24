import { CHARACTER_IDS } from "@/lib/characterSheet";

const SHEET_COLS = 9;

/** A colleague's front-facing pixel portrait, cut from the generated character sheet. */
export function Avatar({
  id,
  size = 48,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const row = CHARACTER_IDS.indexOf(id as (typeof CHARACTER_IDS)[number]);
  const scale = size / 16;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 [image-rendering:pixelated] ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/assets/sprites/characters.png)",
        backgroundSize: `${SHEET_COLS * 16 * scale}px auto`,
        backgroundPosition: `0 -${Math.max(0, row) * 16 * scale}px`,
      }}
    />
  );
}
