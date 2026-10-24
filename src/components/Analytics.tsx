"use client";

import { useEffect } from "react";

type PostHog = typeof import("posthog-js").default;
let client: PostHog | null = null;

/** PostHog product analytics, loaded only when a key is configured. Session replay stays off. */
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || client) return;
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
        capture_pageview: true,
        disable_session_recording: true,
        person_profiles: "identified_only",
      });
      client = posthog;
    });
  }, []);
  return null;
}

/** Funnel events (landing → play → first answer → day-2 return). No-op without a key. */
export function track(event: string, props?: Record<string, unknown>) {
  client?.capture(event, props);
}
