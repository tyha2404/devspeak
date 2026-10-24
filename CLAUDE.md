# DevQuest English

English-learning app for Vietnamese learners, modelled on ForumFlash: two study tracks — grammar by CEFR
level (A1 → C2) and vocabulary by topic (25 topics) — where every lesson is a study phase plus a timed
16-question test. The old pixel-art game lives at git tag `game-v1`; the former workplace ("career") path
was removed from the code (its tables and rows are still in the database, unused).

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind 4 · Supabase (Postgres/Auth/RLS) ·
zustand · zod 4 · Vitest · Playwright. Package manager: pnpm (`corepack pnpm@10 …` if pnpm is not on PATH).

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm test` (unit), `pnpm e2e` (needs a build)
- `pnpm db:start` (Docker), `pnpm db:reset`, `pnpm db:test` (pgTAP), `pnpm db:types`
- `pnpm test:integration` (services against local Supabase), `pnpm seed:content`, `pnpm tts`

## Tracks

- Authoring: `content/curriculum/stages.yaml` (one stage per track) + one YAML per unit in
  `content/curriculum/5-grammar/` (units = CEFR levels, lessons of kind `grammar` = five study screens) and
  `content/curriculum/6-vocab/` (units = topics, lessons of kind `vocab` = word sets of 10 → 36 senses).
  zod: `src/features/curriculum/schema.ts`. `pnpm seed:content` validates every reference and upserts
  stages → units → lessons → `lesson_questions`.
- Tests are generated at seed time (`src/features/curriculum/autoquiz.ts`): 16 vocab questions per word set,
  and the authored grammar items plus translation items built from the lesson's examples (wrong options swap
  confusable words — write examples so that no single swap yields another correct sentence).
- Rules (ForumFlash): sessions are `strict` — 1 attempt, 20s per choice / 30s per typed answer, enforced
  server-side in `submitAnswer`, options listed alphabetically; pass 80%, 3★ = 100%, 2★ ≥ 90%;
  XP = 35 + 15 × stars on every pass; a level test-out (16 questions, 80%) pays 120 XP per pass and opens
  every lesson of the next level. Grammar levels unlock in order; vocabulary topics are all open.
- Pure roadmap logic is `src/features/curriculum/path.ts`; server flows (roadmap, home, start/complete lesson,
  test-out) are `src/features/curriculum/service.ts`. A lesson only completes through `private.complete_lesson`,
  which grades the run's finished quiz session.
- Routes: `src/app/(tracks)` = the app with the top bar (`TracksHeader`): `/` home, `/grammar`, `/vocab`,
  `/review`, `/words`, `/profile`; guests start straight away. `src/app/(focus)` = `/lesson/[id]` and
  `/test-out/[id]`. Old URLs redirect in `next.config.ts`.
- Design tokens live in `src/app/globals.css` (light/dark), ForumFlash palette: `amber` token = deep green
  primary action (`text-on-amber` on it), `merged` = mint (completed), `gold` = stars; Cal Sans headings,
  Alexandria body.

## Content & AI

- Hand-written content: `content/curated/{vocab,questions}/*.yaml` (zod schemas in
  `src/features/content/curated.ts`). `pnpm seed:content` upserts it (new question version only when content changes).
- Open datasets: `pnpm seed:all` (NGSL, CEFR-J, Tatoeba; `pnpm seed:kaikki <file>` for Vietnamese Wiktionary drafts).
- AI generation: `src/features/ai/pipeline.ts` (Batch API → validators → blind-solve + rubric QA → human review in
  `/admin/moderation`). `LLM_FAKE` must be exactly `0` for real Claude calls; anything else uses `FakeLlm`.

## Rules that matter

- **Server decides every score.** XP, streak, SRS, lesson and unit progress are written only through
  `private.*` functions called with the service role (`public.svc_*` wrappers). Clients never write
  to progress tables; RLS + column grants enforce it and `supabase/tests/*.test.sql` proves it.
- **Answer keys never reach the client** before the learner answers (no answers in bundles or `/public`).
- XP ledger `xp_events` is append-only and idempotent on `(user_id, idempotency_key)`.
- UI code (`src/components`, `src/stores`) never imports server modules or `@/features/*` (ESLint enforces);
  shared types go through `src/lib/contracts/*`.
- Keyboard shortcuts in lessons (Enter/Space/1–4) must ignore keys typed into inputs and textareas.
- "Today" is the ICT date (`Asia/Ho_Chi_Minh`); keep `src/lib/time.ts` and `private.local_date` in sync.
- Streaks count days on which a track test was finished (`private.touch_streak`) or `daily_activity.xp`
  reaches the learner's `daily_goal_xp`.
- New migrations go in `supabase/migrations/`; add pgTAP tests for every new RLS policy or grant.
- Content sources must be open-license and recorded in `public.sources`; never use EVP/Oxford/Cambridge data.
