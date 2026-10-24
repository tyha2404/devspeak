// Error monitoring in the browser only when NEXT_PUBLIC_SENTRY_DSN is set; otherwise Sentry isn't loaded at all.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  void import("@sentry/nextjs").then((Sentry) =>
    // Phaser errors surface via window.onerror, which Sentry captures automatically.
    Sentry.init({ dsn, tracesSampleRate: 0.1, replaysSessionSampleRate: 0 }),
  );
}
