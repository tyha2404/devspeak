// Shared class recipes. `amber` (deep green) is reserved for the single primary action on a screen.
export const btn = {
  primary:
    "dq-button inline-flex items-center justify-center gap-2 rounded-xl bg-amber px-5 py-3 font-semibold text-on-amber transition-[background-color,filter,box-shadow] duration-150 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "dq-button inline-flex items-center justify-center gap-2 rounded-xl border border-amber bg-surface px-4 py-2.5 font-semibold text-ink transition-colors duration-150 hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "dq-button inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted hover:text-ink",
};
