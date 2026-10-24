/** Only allow navigation within this app, including when URLs normalize backslashes. */
export function safeAuthNext(next: string | null | undefined, fallback = "/"): string {
  if (!next?.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }
  return next;
}
