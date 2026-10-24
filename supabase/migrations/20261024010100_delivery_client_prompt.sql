-- Keep the exact (shuffled, opaque-id) prompt a learner saw, so re-requesting a pending
-- delivery returns the same question instead of a fresh shuffle.
alter table public.question_deliveries add column client_prompt jsonb not null default '{}';
