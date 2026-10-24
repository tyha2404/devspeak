# Repository Guidelines

## Project Structure & Module Organization

DevQuest English is a Next.js App Router application for Vietnamese developers learning English.

- `src/app/`: pages, layouts, and API routes; route groups organize the main app, focused lessons, and study tracks.
- `src/components/`: React UI; `src/features/`: domain logic; `src/lib/contracts/`: shared API types; `src/stores/`: Zustand state.
- `content/`: YAML curriculum and curated learning material; `scripts/`: content seeding and asset generation.
- `supabase/migrations/`: database changes; `supabase/tests/`: pgTAP tests; `public/`: static assets.
- Unit tests sit beside source files; integration and browser tests live in `tests/`.

## Build, Test, and Development Commands

Use Node.js 22+ and pnpm 10 (`corepack pnpm@10` if needed).

- `pnpm install --frozen-lockfile`: install locked dependencies.
- `pnpm db:start`: start local Supabase; requires Docker. Copy `.env.example` to `.env.local` and configure local keys.
- `pnpm seed:content`: validate references and upsert curriculum and curated content.
- `pnpm dev`: run locally; `pnpm build` and `pnpm start`: build and serve production output.
- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`: check ESLint, TypeScript, and formatting; `pnpm format` applies formatting.
- `pnpm test`, `pnpm test:integration`, `pnpm db:test`, `pnpm e2e`: run unit, integration, database, and browser suites respectively.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, double quotes, and semicolons. Prettier uses a 100-character print width and sorts Tailwind classes. Name React components in PascalCase and functions in camelCase; use `@/` for imports from `src/`. Husky runs lint-staged before commits.

UI components and stores access server logic through API routes; keep shared types in contracts. Keep service-role credentials and answer keys server-side. Scores and progress must be validated on the server.

## Testing Guidelines

Use Vitest `*.test.ts`, Playwright `*.spec.ts`, and pgTAP `*.test.sql`. Integration tests require local Supabase and `.env.local`; seed content before integration/browser testing. Browser tests cover desktop Chromium and mobile. No numeric coverage threshold is configured. Add regression coverage for changed behavior and pgTAP tests for new RLS policies or grants.

## Commit & Pull Request Guidelines

History mixes imperative summaries and `feat:`/`refactor:` prefixes. Write concise, scoped subjects. PRs should explain behavior changes, link relevant issues, report checks, and include screenshots for UI changes. Document migrations and configuration changes; never commit secrets.

## Agent Instructions

If `.codegraph/` exists, use CodeGraph before searching or reading code: `codegraph explore "<question>"` or `codegraph node <symbol-or-file>`. Otherwise, skip indexing.
