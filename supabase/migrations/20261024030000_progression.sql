-- M4: daily words, SRS review logs, quests, achievements, cosmetics shop, promotion, leaderboard,
-- guest merge, account export/delete support.

-- ===== daily words =====
create table public.user_daily_words (
  user_id uuid references auth.users on delete cascade,
  day date not null,
  slot smallint not null check (slot between 1 and 5),
  sense_id bigint not null references public.senses on delete cascade,
  learned_at timestamptz,
  primary key (user_id, day, slot),
  unique (user_id, day, sense_id)
);

create table public.user_word_skips (
  user_id uuid references auth.users on delete cascade,
  sense_id bigint references public.senses on delete cascade,
  skipped_at timestamptz not null default now(),
  primary key (user_id, sense_id)
);

-- ===== SRS =====
create table public.review_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  sense_id bigint not null references public.senses on delete cascade,
  client_review_id uuid not null,
  rating smallint not null check (rating between 1 and 4),
  verified_correct boolean,
  state_before public.srs_state not null,
  stability_before double precision,
  difficulty_before double precision,
  elapsed_days int not null,
  scheduled_days int not null,
  duration_ms int,
  reviewed_at timestamptz not null default now(),
  unique (user_id, client_review_id)
);
create index review_logs_user_idx on public.review_logs (user_id, reviewed_at desc);

-- ===== quests =====
create table public.user_quests (
  user_id uuid references auth.users on delete cascade,
  quest_key text not null,              -- template id, e.g. 'learn_words', 'talk_to:sarah'
  period_key text not null,             -- ICT day '2026-10-24' or week '2026-W43'
  kind text not null check (kind in ('daily', 'weekly')),
  goal int not null check (goal > 0),
  progress int not null default 0,
  reward_xp int not null default 50,
  reward_coins int not null default 10,
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (user_id, quest_key, period_key)
);

-- ===== achievements =====
create table public.user_achievements (
  user_id uuid references auth.users on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ===== cosmetics =====
create table public.user_cosmetics (
  user_id uuid references auth.users on delete cascade,
  item_id text not null,
  equipped boolean not null default false,
  bought_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.coin_events (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  amount int not null,
  reason text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

alter table public.profiles add column leaderboard_opt_out boolean not null default false;
grant update (leaderboard_opt_out) on public.profiles to authenticated;

-- ===== RLS =====
alter table public.user_daily_words enable row level security;
alter table public.user_word_skips enable row level security;
alter table public.review_logs enable row level security;
alter table public.user_quests enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.coin_events enable row level security;

create policy "daily own" on public.user_daily_words for select to authenticated using (user_id = (select auth.uid()));
create policy "skips own" on public.user_word_skips for select to authenticated using (user_id = (select auth.uid()));
create policy "review_logs own" on public.review_logs for select to authenticated using (user_id = (select auth.uid()));
create policy "quests own" on public.user_quests for select to authenticated using (user_id = (select auth.uid()));
create policy "achievements own" on public.user_achievements for select to authenticated using (user_id = (select auth.uid()));
create policy "cosmetics own" on public.user_cosmetics for select to authenticated using (user_id = (select auth.uid()));
create policy "coins own" on public.coin_events for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.user_daily_words, public.user_word_skips, public.review_logs, public.user_quests,
  public.user_achievements, public.user_cosmetics, public.coin_events from anon, authenticated;

-- ===== privileged functions =====

-- Spend coins atomically (shop, PTO days). Fails with hint NOT_ENOUGH_COINS.
create function private.spend_coins(p_user uuid, p_amount int, p_reason text, p_key text) returns int
language plpgsql security definer set search_path = '' as $$
declare v_coins int;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select coins into v_coins from public.profiles where id = p_user for update;
  if v_coins < p_amount then
    raise exception 'not enough coins' using errcode = 'P0001', hint = 'NOT_ENOUGH_COINS';
  end if;
  insert into public.coin_events (user_id, amount, reason, idempotency_key) values (p_user, -p_amount, p_reason, p_key)
  on conflict (user_id, idempotency_key) do nothing;
  if not found then return v_coins; end if;
  update public.profiles set coins = coins - p_amount where id = p_user returning coins into v_coins;
  return v_coins;
end;
$$;

-- Bump progress on every active quest with this key for the user's current periods.
create function private.bump_quest(p_user uuid, p_key text, p_amount int default 1) returns setof public.user_quests
language plpgsql security definer set search_path = '' as $$
declare v_tz text; v_day date;
begin
  select timezone into v_tz from public.profiles where id = p_user;
  v_day := private.local_date(v_tz);
  return query
  update public.user_quests q set
    progress = least(q.goal, q.progress + p_amount),
    completed_at = case when q.completed_at is null and q.progress + p_amount >= q.goal then now() else q.completed_at end
  where q.user_id = p_user and q.quest_key = p_key and q.completed_at is null
    and ((q.kind = 'daily' and q.period_key = v_day::text)
      or (q.kind = 'weekly' and q.period_key = to_char(v_day, 'IYYY-"W"IW')))
  returning q.*;
end;
$$;

-- Claim a completed quest once: XP + coins through the ledger.
create function private.claim_quest(p_user uuid, p_key text, p_period text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare q public.user_quests; v jsonb;
begin
  select * into q from public.user_quests where user_id = p_user and quest_key = p_key and period_key = p_period for update;
  if not found or q.completed_at is null then
    raise exception 'quest not completed' using errcode = 'P0001', hint = 'NOT_COMPLETED';
  end if;
  if q.claimed_at is not null then
    raise exception 'already claimed' using errcode = 'P0001', hint = 'ALREADY_CLAIMED';
  end if;
  update public.user_quests set claimed_at = now() where user_id = p_user and quest_key = p_key and period_key = p_period;
  v := private.award_xp(p_user, q.reward_xp, 'quest_reward', 'quest:' || p_key || ':' || p_period, 'quest', p_key, q.reward_coins);
  return v;
end;
$$;

-- Promotion after passing the boss: rank only moves up, one step at a time.
create function private.promote(p_user uuid, p_to public.career_rank) returns public.career_rank
language plpgsql security definer set search_path = '' as $$
declare v_rank public.career_rank;
begin
  select rank into v_rank from public.profiles where id = p_user for update;
  if (array_position(enum_range(null::public.career_rank), p_to) = array_position(enum_range(null::public.career_rank), v_rank) + 1) then
    update public.profiles set rank = p_to where id = p_user;
    return p_to;
  end if;
  return v_rank;
end;
$$;

-- Weekly (ICT, Monday start) or all-time leaderboard; registered learners only, opt-out respected.
create function public.get_leaderboard(p_period text default 'week', p_limit int default 50)
returns table (rank bigint, display_name text, avatar_key text, xp bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with scores as (
    select e.user_id, sum(e.amount)::bigint as xp
    from public.xp_events e
    where p_period = 'all'
       or e.local_date >= date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh'))::date
    group by e.user_id
  )
  select row_number() over (order by s.xp desc) as rank,
         coalesce(p.display_name, 'Dev #' || left(p.id::text, 4)) as display_name,
         p.avatar_key, s.xp, p.id = (select auth.uid()) as is_me
  from scores s
  join public.profiles p on p.id = s.user_id
  join auth.users u on u.id = s.user_id
  where not coalesce(u.is_anonymous, false) and not p.leaderboard_opt_out
  order by s.xp desc
  limit least(p_limit, 100);
$$;
revoke all on function public.get_leaderboard(text, int) from public, anon;
grant execute on function public.get_leaderboard(text, int) to authenticated;

-- Move a guest's progress into a registered account (email already taken by another user).
create function private.merge_guest(p_from uuid, p_to uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_xp int; v_cards int; v_left int; v_i int := 0;
begin
  if not exists (select 1 from auth.users where id = p_from and is_anonymous) then
    raise exception 'source is not a guest' using errcode = 'P0001', hint = 'NOT_GUEST';
  end if;
  -- Ledger: re-key so nothing is double counted, then recompute totals through award_xp.
  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = p_from;
  -- The ledger caps one event at 5000 XP, so large balances move in chunks.
  v_left := v_xp;
  while v_left > 0 loop
    perform private.award_xp(p_to, least(v_left, 5000), 'merge', 'merge:' || p_from::text || ':' || v_i, 'user', p_from::text, 0);
    v_left := v_left - 5000;
    v_i := v_i + 1;
  end loop;
  update public.profiles t set coins = t.coins + f.coins from public.profiles f where t.id = p_to and f.id = p_from;
  -- Cards: keep the further-along card per sense.
  insert into public.user_cards (user_id, sense_id, state, due, stability, difficulty, elapsed_days, scheduled_days,
    learning_steps, reps, lapses, last_review, added_via, added_at)
  select p_to, sense_id, state, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses,
    last_review, added_via, added_at from public.user_cards where user_id = p_from
  on conflict (user_id, sense_id) do update set
    state = excluded.state, due = excluded.due, stability = excluded.stability, difficulty = excluded.difficulty,
    reps = excluded.reps, lapses = excluded.lapses, last_review = excluded.last_review
  where excluded.reps > public.user_cards.reps;
  get diagnostics v_cards = row_count;
  insert into public.user_achievements (user_id, achievement_id, unlocked_at)
    select p_to, achievement_id, unlocked_at from public.user_achievements where user_id = p_from
  on conflict do nothing;
  insert into public.user_cosmetics (user_id, item_id, bought_at)
    select p_to, item_id, bought_at from public.user_cosmetics where user_id = p_from
  on conflict do nothing;
  update public.dialogue_runs set user_id = p_to where user_id = p_from;
  delete from auth.users where id = p_from;
  return jsonb_build_object('xp', v_xp, 'cards', v_cards);
end;
$$;

-- Service-role entry points.
create function public.svc_spend_coins(p_user uuid, p_amount int, p_reason text, p_key text) returns int
language sql security definer set search_path = '' as $$ select private.spend_coins(p_user, p_amount, p_reason, p_key); $$;
create function public.svc_bump_quest(p_user uuid, p_key text, p_amount int default 1) returns setof public.user_quests
language sql security definer set search_path = '' as $$ select * from private.bump_quest(p_user, p_key, p_amount); $$;
create function public.svc_claim_quest(p_user uuid, p_key text, p_period text) returns jsonb
language sql security definer set search_path = '' as $$ select private.claim_quest(p_user, p_key, p_period); $$;
create function public.svc_promote(p_user uuid, p_to public.career_rank) returns public.career_rank
language sql security definer set search_path = '' as $$ select private.promote(p_user, p_to); $$;
create function public.svc_merge_guest(p_from uuid, p_to uuid) returns jsonb
language sql security definer set search_path = '' as $$ select private.merge_guest(p_from, p_to); $$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
do $$
declare f text;
begin
  foreach f in array array[
    'public.svc_spend_coins(uuid, int, text, text)', 'public.svc_bump_quest(uuid, text, int)',
    'public.svc_claim_quest(uuid, text, text)', 'public.svc_promote(uuid, public.career_rank)',
    'public.svc_merge_guest(uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
