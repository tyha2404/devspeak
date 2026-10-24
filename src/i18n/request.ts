import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

/** Locale from the NEXT_LOCALE cookie, else Accept-Language, else Vietnamese. No URL prefixes. */
export default getRequestConfig(async () => {
  const cookie = (await cookies()).get("NEXT_LOCALE")?.value;
  const accept = (await headers()).get("accept-language") ?? "";
  const locale: Locale = LOCALES.includes(cookie as Locale)
    ? (cookie as Locale)
    : accept.toLowerCase().startsWith("en")
      ? "en"
      : DEFAULT_LOCALE;
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
