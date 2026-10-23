export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

/** Calendar date (YYYY-MM-DD) of `at` in `timeZone`. Matches `private.local_date` in Postgres. */
export function localDate(at: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}
