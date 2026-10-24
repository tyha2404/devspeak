-- M3: AI content generation jobs, usage/cost accounting, moderation audit, cron bookkeeping.

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('questions', 'qa_solve', 'qa_rubric', 'enrich')),
  params jsonb not null default '{}',
  prompt_version text not null,
  model text not null,
  anthropic_batch_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'ended', 'ingesting', 'ingested', 'failed', 'canceled')),
  request_count int not null default 0,
  succeeded int not null default 0,
  errored int not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  ended_at timestamptz,
  ingested_at timestamptz,
  last_error text
);
create index generation_jobs_status_idx on public.generation_jobs (status, created_at);

create table public.generation_items (
  job_id uuid references public.generation_jobs on delete cascade,
  custom_id text not null,
  target jsonb not null,                -- {senseId, senseSlug, cefr, npcId, topic} or {questionId}
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'invalid', 'errored', 'expired', 'ingested', 'retried')),
  attempts smallint not null default 1,
  result_question_ids uuid[] not null default '{}',
  error text,
  primary key (job_id, custom_id)
);

create table public.api_usage (
  id bigserial primary key,
  user_id uuid references auth.users on delete set null,
  feature text not null,                -- 'gen_questions','qa_solve','qa_rubric','enrich','npc_chat','npc_summary'
  model text not null,
  request_id text,
  batch_id text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd_micros bigint not null default 0,
  latency_ms int,
  status text not null,
  created_at timestamptz not null default now()
);
create index api_usage_created_idx on public.api_usage using brin (created_at);
create index api_usage_user_idx on public.api_usage (user_id, created_at desc);

create view public.api_usage_daily with (security_invoker = true) as
  select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, feature, model,
         count(*) as requests, sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens,
         sum(cache_read_tokens) as cache_read_tokens, sum(cost_usd_micros) as cost_usd_micros
  from public.api_usage group by 1, 2, 3;

create table public.moderation_actions (
  id bigserial primary key,
  actor_id uuid references auth.users on delete set null,
  entity text not null check (entity in ('question', 'sense', 'chat_session', 'report')),
  entity_id text not null,
  action text not null check (action in ('approve', 'reject', 'edit', 'regenerate', 'resolve')),
  reason text,
  diff jsonb,
  created_at timestamptz not null default now()
);

create table public.cron_runs (
  job text not null,
  run_key text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  detail jsonb,
  primary key (job, run_key)
);

alter table public.generation_jobs enable row level security;
alter table public.generation_items enable row level security;
alter table public.api_usage enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.cron_runs enable row level security;

revoke all on public.generation_jobs, public.generation_items, public.api_usage, public.moderation_actions,
  public.cron_runs from anon, authenticated;
grant select on public.generation_jobs, public.generation_items, public.api_usage, public.moderation_actions,
  public.api_usage_daily to authenticated;
create policy "jobs editor read" on public.generation_jobs for select to authenticated using ((select public.has_role('editor')));
create policy "items editor read" on public.generation_items for select to authenticated using ((select public.has_role('editor')));
create policy "usage editor read" on public.api_usage for select to authenticated using ((select public.has_role('editor')));
create policy "moderation editor read" on public.moderation_actions for select to authenticated using ((select public.has_role('editor')));

-- Today's AI spend across all features (global kill switch input).
create function private.ai_spend_today() returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cost_usd_micros), 0)::bigint from public.api_usage
  where created_at >= ((now() at time zone 'Asia/Ho_Chi_Minh')::date::timestamp at time zone 'Asia/Ho_Chi_Minh');
$$;
create function public.svc_ai_spend_today() returns bigint
language sql stable security definer set search_path = '' as $$ select private.ai_spend_today(); $$;
revoke all on function private.ai_spend_today() from public, anon, authenticated;
grant execute on function private.ai_spend_today() to service_role;
revoke all on function public.svc_ai_spend_today() from public, anon, authenticated;
grant execute on function public.svc_ai_spend_today() to service_role;

-- Questions needing human review, newest first (moderation queue helper index).
create index questions_review_idx on public.questions (status, created_at desc) where status in ('auto_checked', 'in_review');
