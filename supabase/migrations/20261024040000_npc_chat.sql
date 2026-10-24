-- M5: live NPC chat sessions and messages.
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  npc_id text not null,
  scenario_id text not null,
  prompt_version text not null,
  model text not null,
  status text not null default 'active' check (status in ('active', 'ended', 'flagged', 'limit_reached')),
  turn_count smallint not null default 0,
  goal_progress smallint not null default 0,
  break_attempts smallint not null default 0,
  summary text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd_micros bigint not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index chat_sessions_user_idx on public.chat_sessions (user_id, started_at desc);

create table public.chat_messages (
  id bigserial primary key,
  session_id uuid not null references public.chat_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 2000),
  feedback jsonb,
  stop_reason text,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index chat_messages_session_idx on public.chat_messages (session_id, id);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
create policy "chat sessions own" on public.chat_sessions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('editor')));
create policy "chat messages own" on public.chat_messages for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('editor')));
revoke insert, update, delete on public.chat_sessions, public.chat_messages from anon, authenticated;

-- Chat logs are kept 30 days (privacy policy); run daily from cron.
create function private.purge_chat_logs() returns int
language sql security definer set search_path = '' as $$
  with d as (delete from public.chat_messages where created_at < now() - interval '30 days' returning 1)
  select count(*)::int from d;
$$;
create function public.svc_purge_chat_logs() returns int
language sql security definer set search_path = '' as $$ select private.purge_chat_logs(); $$;
revoke all on function private.purge_chat_logs() from public, anon, authenticated;
grant execute on function private.purge_chat_logs() to service_role;
revoke all on function public.svc_purge_chat_logs() from public, anon, authenticated;
grant execute on function public.svc_purge_chat_logs() to service_role;
