# DevQuest English

English-learning game for Vietnamese developers (CEFR A2–B2): a 2D pixel top-down office where the
player talks to NPCs. Full plan: `/Users/tyha/.claude/plans/jaunty-churning-beacon.md`.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind 4 · Phaser 3 · Supabase (Postgres/Auth/RLS) ·
zustand · zod 4 · Vitest · Playwright. Package manager: pnpm (`corepack pnpm@10 …` if pnpm is not on PATH).

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm test` (unit), `pnpm e2e` (needs a build)
- `pnpm db:start` (Docker), `pnpm db:reset`, `pnpm db:test` (pgTAP), `pnpm db:types`

## Game assets & maps

- Art sources: `art/vendor/` (Kenney CC0 sheets) and `art/pixel/` (our own pixel art as string
  templates: characters are one template + palette per NPC). `pnpm assets` builds extruded tilesets and
  the character sheet into `public/assets/` (generated files are committed; CI checks they are fresh).
- Maps are TypeScript specs in `art/maps/*.ts` (ASCII grid + prefab placements + objects).
  `pnpm maps` compiles them to Tiled JSON in `public/assets/maps/` and validates door targets, spawns,
  NPC ids and collision. Preview a whole map as PNG: `pnpm tsx scripts/preview-maps.ts <dir>`.
- New maps: add the spec to `art/maps/index.ts` and mark it `built` in `src/game/data/maps.ts`.
- E2E uses `?e2e=1` hooks (`window.__dq.teleport`) and builds into `.next-e2e` so a running
  `next dev` can't clobber it.

## Rules that matter

- **Server decides every score.** XP, level, streak, SRS, quests are written only through
  `private.*` functions called with the service role (`public.svc_*` wrappers). Clients never write
  to progress tables; RLS + column grants enforce it and `supabase/tests/*.test.sql` proves it.
- **Answer keys never reach the client** before the learner answers (no answers in bundles or `/public`).
- XP ledger `xp_events` is append-only and idempotent on `(user_id, idempotency_key)`.
- `src/game/**` is Phaser only: no Supabase/Anthropic imports (ESLint enforces). React and Phaser talk
  through the typed `EventBus` (`src/game/events.ts`), which must stay free of Phaser imports so React
  can import it during SSR. Phaser itself is loaded via `next/dynamic` with `ssr: false`.
- Lock game input while an overlay is open (`input:lock` / `input:unlock`): the scene disables key
  capture (otherwise Space can't be typed) and resets keys on unlock.
- "Today" is the ICT date (`Asia/Ho_Chi_Minh`); keep `src/lib/time.ts` and `private.local_date` in sync.
- `src/game/config/progression.ts` mirrors `public.level_thresholds`; change both together.
- New migrations go in `supabase/migrations/`; add pgTAP tests for every new RLS policy or grant.
- Content sources must be open-license and recorded in `public.sources`; never use EVP/Oxford/Cambridge data.
