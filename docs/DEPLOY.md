# Deploying DevQuest English

Everything below needs accounts this repo can't create for you. Order matters.

## 1. Supabase (region: Singapore `ap-southeast-1`)

1. Create a project (Pro plan for PITR backups at launch).
2. `pnpm exec supabase link --project-ref <ref>` then `pnpm exec supabase db push` (all migrations in `supabase/migrations`).
3. Auth → Providers: enable **Anonymous sign-ins** and **Email (password, signup confirmation and password recovery)**.
   Guest progress is merged into the registered account after authentication.
4. Auth → URL configuration: Site URL = production URL; redirect URLs = `https://<domain>/auth/callback`.
5. Auth → SMTP: custom SMTP (e.g. Resend). The built-in mailer is rate-limited and not for production.
   Use Vietnamese email templates (subject "Đăng nhập DevQuest English").
   Keep the default confirmation URL for the PKCE `/auth/callback` flow. Custom templates using
   `token_hash` must target `/auth/confirm?token_hash={{ .TokenHash }}&type=signup` (or `recovery`).
   Recovery links without `next` open `/account/password`; other types open `/`.
   Apply the signup display-name and guest-history migrations before enabling the new login UI.
6. Auth → Captcha: Cloudflare Turnstile (secret here, site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
7. Seed content: `pnpm seed:all` with production `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SECRET_KEY` in the environment.
8. Grant yourself admin: sign in once, then `pnpm grant-role you@example.com admin`.
9. Optional cron via Supabase (needed on Vercel Hobby): store `app_url` and `cron_secret` in Vault, run `supabase/cron.sql`.

## 2. Vercel (region `sin1`, set in `vercel.json`)

Environment variables (Production):

| Variable                                                           | Value                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                             | `https://<domain>`                                               |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from Supabase → API                                              |
| `SUPABASE_SECRET_KEY`                                              | from Supabase → API (server only)                                |
| `ANTHROPIC_API_KEY`                                                | Claude API key                                                   |
| `LLM_FAKE`                                                         | `0` (real Claude). Anything else keeps the offline fake.         |
| `ANTHROPIC_MODEL_GEN` / `ANTHROPIC_MODEL_QA`                       | defaults: `claude-sonnet-5-5` / `claude-haiku-5-5`               |
| `AI_DAILY_BUDGET_USD`                                              | global kill switch, e.g. `15`                                    |
| `AI_DAILY_PACKS`                                                   | generation packs per day, e.g. `150`                             |
| `AI_AUTO_APPROVE`                                                  | `false` for the first weeks (every AI item goes through a human) |
| `CRON_SECRET`                                                      | long random string; Vercel Cron sends it automatically           |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`                             | optional error monitoring                                        |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`              | optional analytics                                               |

Crons (`vercel.json`): `content-plan` daily 00:00 ICT, `batch-poll` every 15 min (Pro plan; on Hobby use `supabase/cron.sql`),
`daily` 23:30 ICT (housekeeping).

## 3. GitHub

CI (`.github/workflows/ci.yml`) runs lint, types, unit, pgTAP, integration and E2E against a local Supabase on every PR.
Add a protected `production` environment with `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`
if you want `db push` from CI; migrations must stay backward-compatible because Vercel deploys separately.
