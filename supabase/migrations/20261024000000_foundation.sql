-- M0 foundation: identity, roles, provenance, XP ledger.
-- Conventions:
--   * RLS on every table; server-only tables also revoke all from anon/authenticated.
--   * Privileged functions live in schema `private` (not exposed by PostgREST),
--     are security definer with an empty search_path, and are executable by service_role only.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- ===== enums =====
create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1');
create type public.app_role as enum ('editor', 'admin');
create type public.career_rank as enum ('intern', 'junior', 'mid', 'senior', 'techlead');
create type public.xp_reason as enum (
  'quiz_correct', 'daily_learn', 'daily_complete', 'review', 'dialogue_complete',
  'minigame_complete', 'chat_session', 'quest_reward', 'achievement_reward', 'boss_pass',
  'streak_bonus', 'admin_adjust', 'merge'
);

-- ===== helpers =====
create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ===== level thresholds (cumulative XP needed to reach a level) =====
create table public.level_thresholds (
  level int primary key check (level >= 1),
  xp_required int not null unique check (xp_required >= 0)
);

insert into public.level_thresholds (level, xp_required)
select l, xp from (
  values (1, 0), (2, 150), (3, 350), (4, 600), (5, 900),          -- Intern
         (6, 1250), (7, 1650), (8, 2100), (9, 2600), (10, 3150),  -- Junior
         (11, 3750), (12, 4400)
) as t(l, xp)
union all select l, 5100 + (l - 13) * 800 from generate_series(13, 21) l    -- Mid (L21 = 11,500)
union all select l, 11500 + (l - 21) * 1000 from generate_series(22, 31) l  -- Senior (L31 = 21,500)
union all select l, 21500 + (l - 31) * 1200 from generate_series(32, 40) l; -- Tech Lead

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) between 1 and 32),
  avatar_key text not null default 'dev_01',
  ui_locale text not null default 'vi' check (ui_locale in ('vi', 'en')),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  target_level public.cefr_level not null default 'A2',
  placement_level public.cefr_level,
  rank public.career_rank not null default 'intern',
  xp_total int not null default 0 check (xp_total >= 0),
  level int not null default 1,
  coins int not null default 0 check (coins >= 0),
  streak_current int not null default 0,
  streak_longest int not null default 0,
  streak_last_date date,
  streak_freezes smallint not null default 0 check (streak_freezes between 0 and 2),
  position jsonb not null default '{"map":"office-floor","x":320,"y":240,"facing":"down"}',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ===== roles =====
create table public.user_roles (
  user_id uuid references auth.users on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Callable from RLS policies by authenticated users; only ever answers for the caller.
create function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and (ur.role = r or ur.role = 'admin')
  );
$$;
revoke all on function public.has_role(public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;

-- ===== content provenance =====
create table public.sources (
  id smallserial primary key,
  slug text unique not null,
  name text not null,
  url text,
  license_spdx text not null,
  license_url text,
  attribution_text text not null,
  share_alike boolean not null,
  commercial_ok boolean not null,
  version text,
  sha256 text,
  retrieved_at date,
  notes text
);

-- ===== XP ledger + daily activity (server-only writes) =====
create table public.xp_events (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  amount int not null check (amount <> 0 and amount between -5000 and 5000),
  reason public.xp_reason not null,
  ref_type text,
  ref_id text,
  idempotency_key text not null,
  local_date date not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index xp_events_user_created_idx on public.xp_events (user_id, created_at desc);
create index xp_events_date_user_idx on public.xp_events (local_date, user_id);

create table public.daily_activity (
  user_id uuid references auth.users on delete cascade,
  local_date date not null,
  xp int not null default 0,
  xp_quiz int not null default 0,
  xp_review int not null default 0,
  answers int not null default 0,
  reviews int not null default 0,
  chat_turns int not null default 0,
  primary key (user_id, local_date)
);

-- ===== RLS =====
alter table public.level_thresholds enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.sources enable row level security;
alter table public.xp_events enable row level security;
alter table public.daily_activity enable row level security;

-- Public reference data.
create policy "level_thresholds readable" on public.level_thresholds for select using (true);
create policy "sources readable" on public.sources for select using (true);
create policy "sources editable by admin" on public.sources for all to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

-- Profiles: read own; update only cosmetic/preference columns (column grants below).
create policy "profiles select own" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_role('editor')));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar_key, ui_locale, timezone, target_level)
  on public.profiles to authenticated;

-- Roles: users can see their own roles; admins manage roles.
create policy "user_roles select own" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('admin')));
create policy "user_roles admin manage" on public.user_roles for all to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

-- Ledger and activity: read own, never write from a client session.
create policy "xp_events select own" on public.xp_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy "daily_activity select own" on public.daily_activity for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.xp_events, public.daily_activity from anon, authenticated;

-- ===== privileged functions =====

-- Today's date in a user's timezone (defaults to ICT).
create function private.local_date(p_tz text default 'Asia/Ho_Chi_Minh', p_at timestamptz default now())
returns date language sql stable set search_path = '' as $$
  select (p_at at time zone coalesce(p_tz, 'Asia/Ho_Chi_Minh'))::date;
$$;

-- Append to the XP ledger exactly once per (user, key) and update cached totals.
-- Returns {duplicate:true} when the key was already used.
create function private.award_xp(
  p_user uuid,
  p_amount int,
  p_reason public.xp_reason,
  p_key text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_coins int default 0,
  p_metadata jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_today date;
  v_event_id bigint;
  v_day_xp int;
  v_new_level int;
begin
  select * into v_profile from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile % not found', p_user using errcode = 'P0002';
  end if;

  v_today := private.local_date(v_profile.timezone);

  insert into public.xp_events (user_id, amount, reason, ref_type, ref_id, idempotency_key, local_date, metadata)
  values (p_user, p_amount, p_reason, p_ref_type, p_ref_id, p_key, v_today, p_metadata)
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('duplicate', true, 'xp_total', v_profile.xp_total,
      'level', v_profile.level, 'streak', v_profile.streak_current);
  end if;

  insert into public.daily_activity (user_id, local_date, xp, xp_quiz, xp_review)
  values (p_user, v_today, p_amount,
    case when p_reason = 'quiz_correct' then p_amount else 0 end,
    case when p_reason = 'review' then p_amount else 0 end)
  on conflict (user_id, local_date) do update set
    xp = public.daily_activity.xp + excluded.xp,
    xp_quiz = public.daily_activity.xp_quiz + excluded.xp_quiz,
    xp_review = public.daily_activity.xp_review + excluded.xp_review
  returning xp into v_day_xp;

  v_profile.xp_total := greatest(0, v_profile.xp_total + p_amount);
  v_profile.coins := greatest(0, v_profile.coins + p_coins);

  select max(level) into v_new_level from public.level_thresholds
  where xp_required <= v_profile.xp_total;

  -- A streak day counts once the learner earns >= 50 XP that day.
  if v_day_xp >= 50 and v_profile.streak_last_date is distinct from v_today then
    if v_profile.streak_last_date = v_today - 1 then
      v_profile.streak_current := v_profile.streak_current + 1;
    elsif v_profile.streak_last_date = v_today - 2 and v_profile.streak_freezes > 0 then
      v_profile.streak_freezes := v_profile.streak_freezes - 1;  -- PTO day covers the gap
      v_profile.streak_current := v_profile.streak_current + 1;
    else
      v_profile.streak_current := 1;
    end if;
    v_profile.streak_last_date := v_today;
    v_profile.streak_longest := greatest(v_profile.streak_longest, v_profile.streak_current);
  end if;

  update public.profiles set
    xp_total = v_profile.xp_total,
    coins = v_profile.coins,
    level = v_new_level,
    streak_current = v_profile.streak_current,
    streak_longest = v_profile.streak_longest,
    streak_last_date = v_profile.streak_last_date,
    streak_freezes = v_profile.streak_freezes
  where id = p_user;

  return jsonb_build_object(
    'duplicate', false,
    'xp_total', v_profile.xp_total,
    'coins', v_profile.coins,
    'level', v_new_level,
    'leveled_up', v_new_level > v_profile.level,
    'streak', v_profile.streak_current
  );
end;
$$;

-- Saves the player's world position (validated further in the route handler).
create function private.save_position(p_user uuid, p_position jsonb) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set position = p_position where id = p_user;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;

-- ===== service-role RPC entry points =====
-- PostgREST does not expose `private`, so route handlers (service role) call these thin
-- public wrappers. Supabase grants execute on new public functions to anon/authenticated
-- by default, so revoke explicitly.
create function public.svc_award_xp(
  p_user uuid, p_amount int, p_reason public.xp_reason, p_key text,
  p_ref_type text default null, p_ref_id text default null,
  p_coins int default 0, p_metadata jsonb default '{}'
) returns jsonb
language sql security definer set search_path = '' as $$
  select private.award_xp(p_user, p_amount, p_reason, p_key, p_ref_type, p_ref_id, p_coins, p_metadata);
$$;

create function public.svc_save_position(p_user uuid, p_position jsonb) returns void
language sql security definer set search_path = '' as $$
  select private.save_position(p_user, p_position);
$$;

revoke all on function public.svc_award_xp(uuid, int, public.xp_reason, text, text, text, int, jsonb)
  from public, anon, authenticated;
revoke all on function public.svc_save_position(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.svc_award_xp(uuid, int, public.xp_reason, text, text, text, int, jsonb)
  to service_role;
grant execute on function public.svc_save_position(uuid, jsonb) to service_role;
