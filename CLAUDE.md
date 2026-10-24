# DevQuest English

English-learning app for Vietnamese developers (CEFR A2–B2) with a clear path: 4 stages → 36 units
(workplace situations + technical knowledge in English) → lessons. Full plan:
`/Users/tyha/.claude/plans/jaunty-churning-beacon.md`. The old pixel-art game lives at git tag `game-v1`.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind 4 · Supabase (Postgres/Auth/RLS) ·
zustand · zod 4 · Vitest · Playwright. Package manager: pnpm (`corepack pnpm@10 …` if pnpm is not on PATH).

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm test` (unit), `pnpm e2e` (needs a build)
- `pnpm db:start` (Docker), `pnpm db:reset`, `pnpm db:test` (pgTAP), `pnpm db:types`
- `pnpm test:integration` (services against local Supabase), `pnpm assets` (character portraits)

## Learning path

- Authoring: `content/curriculum/stages.yaml` + one YAML per unit in `content/curriculum/<n>-<stage>/`
  (zod: `src/features/curriculum/schema.ts`). Lessons reference questions/senses/dialogues/mistakes by slug;
  `pnpm seed:content` validates every reference and upserts stages → units → lessons → `lesson_questions`.
- Pure path logic (unlock order, next step, stars, placement) is `src/features/curriculum/path.ts`; server flows
  (start/complete lesson, task grading, test-out, checkpoint, placement) are `src/features/curriculum/service.ts`.
- A lesson only completes through `private.complete_lesson`, which grades the `lesson_runs` evidence (finished quiz
  session, completed dialogue run, graded task). Answers inside lessons pay no XP; the lesson does, once (replays 30%/day).
- UI: `src/app/(app)` (sidebar/bottom-nav shell), `src/app/(focus)` (lesson player, exams, onboarding).
  Design tokens live in `src/app/globals.css` (light/dark); amber = primary action, violet = completed.
- Character portraits: `art/pixel/characters.ts` → `pnpm assets` → `public/assets/sprites/characters.png`.

## Content & AI

- Hand-written content: `content/curated/{vocab,questions,dialogues}/*.yaml` (zod schemas in
  `src/features/content/curated.ts`). `pnpm seed:content` upserts it (new question version only when content changes).
- Open datasets: `pnpm seed:all` (NGSL, CEFR-J, Tatoeba; `pnpm seed:kaikki <file>` for Vietnamese Wiktionary drafts).
- AI generation: `src/features/ai/pipeline.ts` (Batch API → validators → blind-solve + rubric QA → human review in
  `/admin/moderation`). `LLM_FAKE` must be exactly `0` for real Claude calls; anything else uses `FakeLlm`.
- NPC chat: `src/features/npc-chat` (quotas, budget kill switch, circuit breaker). Eval: `pnpm eval:chat` (real API).

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
- Streaks count days on which `daily_activity.xp` reaches the learner's `daily_goal_xp`.
- New migrations go in `supabase/migrations/`; add pgTAP tests for every new RLS policy or grant.
- Content sources must be open-license and recorded in `public.sources`; never use EVP/Oxford/Cambridge data.
