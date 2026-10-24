import { BootstrapSchema } from "@/lib/contracts/bootstrap";
import type { DialogueStep, GlossEntry } from "@/lib/contracts/dialogue";
import type { Position } from "@/lib/contracts/position";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new ApiError(
      json?.error?.code ?? "INTERNAL",
      json?.error?.message ?? `HTTP ${res.status}`,
      res.status,
    );
  }
  return json.data as T;
}

export const api = {
  get: <T>(url: string) => call<T>("GET", url),
  post: <T>(url: string, body?: unknown) => call<T>("POST", url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => call<T>("PATCH", url, body ?? {}),
  del: <T>(url: string, body?: unknown) => call<T>("DELETE", url, body ?? {}),
};

export async function fetchBootstrap() {
  return BootstrapSchema.parse(await api.get("/api/bootstrap"));
}

export const startDialogue = (npcId: string) =>
  api.post<DialogueStep>("/api/dialogues/start", { npcId });
export const advanceDialogue = (runId: string, choiceId?: string, text?: string) =>
  api.post<DialogueStep>("/api/dialogues/advance", { runId, choiceId, text });
export const fetchGlossary = (slugs: string[]) =>
  api.get<Record<string, GlossEntry>>(
    `/api/glossary?slugs=${slugs.map(encodeURIComponent).join(",")}`,
  );
export const addToNotebook = (slug: string) =>
  api.post<{ added: boolean }>("/api/notebook", { slug });

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
