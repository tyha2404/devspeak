import { BootstrapSchema } from "@/lib/contracts/bootstrap";
import type { Position } from "@/lib/contracts/position";

export async function fetchBootstrap() {
  const res = await fetch("/api/bootstrap", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json.ok)
    throw new Error(json?.error?.message ?? `bootstrap failed (${res.status})`);
  return BootstrapSchema.parse(json.data);
}

export function savePosition(p: Position, opts: { beacon?: boolean } = {}) {
  const body = JSON.stringify(p);
  if (opts.beacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/progress/position", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/progress/position", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
