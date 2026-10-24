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
