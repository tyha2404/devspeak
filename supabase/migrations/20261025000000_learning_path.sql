-- Pivot from game to learning path: stages → units → lessons, lesson runs as completion evidence,
-- checkpoints + certificates, situation/mistake libraries. Removes the game economy
-- (ranks, levels, coins, shop, quests, achievements, leaderboard, world position, daily words).

-- ===== remove the game layer =====
drop function if exists public.svc_spend_coins(uuid, int, text, text);
drop function if exists public.svc_bump_quest(uuid, text, int);
drop function if exists public.svc_claim_quest(uuid, text, text);
drop function if exists public.svc_promote(uuid, public.career_rank);
drop function if exists public.svc_save_position(uuid, jsonb);
drop function if exists public.get_leaderboard(text, int);
drop function if exists private.spend_coins(uuid, int, text, text);
drop function if exists private.bump_quest(uuid, text, int);
drop function if exists private.claim_quest(uuid, text, text);
drop function if exists private.promote(uuid, public.career_rank);
drop function if exists private.save_position(uuid, jsonb);

drop table if exists public.user_quests, public.user_achievements, public.user_cosmetics,
  public.coin_events, public.user_daily_words, public.user_word_skips, public.level_thresholds;

alter table public.profiles
  drop column if exists rank,
  drop column if exists level,
  drop column if exists coins,
  drop column if exists position,
  drop column if exists avatar_key,
  drop column if exists leaderboard_opt_out;
drop type if exists public.career_rank;

alter type public.xp_reason add value if not exists 'lesson_complete';
alter type public.xp_reason add value if not exists 'checkpoint_pass';

-- ===== curriculum (public reference data) =====
create type public.unit_kind as enum ('situation', 'knowledge');
create type public.lesson_kind as enum (
  'vocab', 'dialogue', 'focus', 'practice', 'reading', 'listening', 'mistakes', 'task'
);

create table public.stages (
  id smallserial primary key,
  slug text unique not null,
  sort smallint not null unique,
  cefr public.cefr_level not null,
  title_en text not null,
  title_vi text not null,
  tagline_vi text not null,
  description_vi text not null,
  checkpoint_size smallint not null default 12 check (checkpoint_size between 4 and 30),
  checkpoint_pass_pct smallint not null default 70 check (checkpoint_pass_pct between 50 and 100)
);

create table public.units (
  id serial primary key,
  stage_id smallint not null references public.stages on delete cascade,
  slug text unique not null,
  sort smallint not null,
  code text not null,
  kind public.unit_kind not null,
  cefr public.cefr_level not null,
  character text not null,
  title_en text not null,
  title_vi text not null,
  summary_vi text not null,
  can_do jsonb not null default '[]',
  roleplay jsonb,
  status public.content_status not null default 'draft',
  unique (stage_id, sort)
);

create table public.lessons (
  id serial primary key,
  unit_id int not null references public.units on delete cascade,
  slug text unique not null,
  sort smallint not null,
  kind public.lesson_kind not null,
  title_en text not null,
  title_vi text not null,
  est_minutes smallint not null,
  xp smallint not null check (xp between 0 and 100),
  pass_pct smallint not null default 60 check (pass_pct between 0 and 100),
  question_count smallint not null default 0,   -- questions graded per run (sampled when the pool is larger)
  body jsonb not null default '{}',             -- public content: senses, dialogue slug, markdown, passage, task prompt
  private jsonb not null default '{}',          -- server-only: task model answer and keywords
  dialogue_id uuid references public.dialogues on delete set null,
  unique (unit_id, sort)
);

-- Which questions a lesson draws from (server-only: the bank itself is server-only).
create table public.lesson_questions (
  lesson_id int references public.lessons on delete cascade,
  question_id uuid references public.questions on delete cascade,
  sort smallint not null default 0,
  primary key (lesson_id, question_id)
);

create table public.situations (
  id serial primary key,
  slug text unique not null,
  category text not null,
  cefr public.cefr_level not null,
  title_en text not null,
  title_vi text not null,
  context_vi text not null,
  phrases jsonb not null,
  mistakes text[] not null default '{}',
  unit_id int references public.units on delete set null,
  roleplay jsonb,
  sort int not null default 0
);

create table public.mistakes (
  id serial primary key,
  slug text unique not null,
  kind text not null check (kind in ('grammar', 'word-choice', 'pronunciation', 'symbol', 'register')),
  wrong text,
  "right" text not null,
  say text,
  explanation_vi text not null,
  tags text[] not null default '{}'
);

-- ===== learner progress (read own, written only by the service role) =====
create table public.user_lesson_progress (
  user_id uuid references auth.users on delete cascade,
  lesson_id int references public.lessons on delete cascade,
  stars smallint not null default 0 check (stars between 0 and 3),
  best_pct smallint not null default 0,
  attempts int not null default 0,
  completed_at timestamptz,
  last_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.user_unit_progress (
  user_id uuid references auth.users on delete cascade,
  unit_id int references public.units on delete cascade,
  via text not null check (via in ('lessons', 'test_out', 'placement')),
  completed_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

-- Evidence for completing a lesson: the quiz session, dialogue run and task grade it produced.
create table public.lesson_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_id int not null references public.lessons on delete cascade,
  quiz_session_id uuid references public.quiz_sessions on delete set null,
  dialogue_run_id uuid references public.dialogue_runs on delete set null,
  task_score smallint check (task_score between 0 and 3),
  task_feedback jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb
);
create index lesson_runs_user_idx on public.lesson_runs (user_id, lesson_id, started_at desc);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  stage_id smallint not null references public.stages on delete cascade,
  score_pct smallint not null,
  issued_at timestamptz not null default now(),
  unique (user_id, stage_id)
);

-- Quiz sessions now belong to lessons, checkpoints and unit test-outs.
alter table public.quiz_sessions drop constraint if exists quiz_sessions_kind_check;
update public.quiz_sessions set kind = 'practice' where kind in ('daily', 'boss');
alter table public.quiz_sessions add constraint quiz_sessions_kind_check
  check (kind in ('npc', 'practice', 'review_verify', 'placement', 'lesson', 'checkpoint', 'test_out'));
alter table public.quiz_sessions add column ref text;  -- e.g. 'lesson:12', 'stage:3', 'unit:7'

alter table public.profiles
  add column daily_goal_xp smallint not null default 20 check (daily_goal_xp in (10, 20, 30, 50)),
  add column goal_reason text check (goal_reason in ('job', 'interview', 'docs', 'client', 'general')),
  add column current_unit_id int references public.units on delete set null;

-- ===== RLS =====
alter table public.stages enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_questions enable row level security;
alter table public.situations enable row level security;
alter table public.mistakes enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.user_unit_progress enable row level security;
alter table public.lesson_runs enable row level security;
alter table public.certificates enable row level security;

create policy "stages readable" on public.stages for select using (true);
create policy "units readable" on public.units for select using (true);
create policy "lessons readable" on public.lessons for select using (true);
create policy "situations readable" on public.situations for select using (true);
create policy "mistakes readable" on public.mistakes for select using (true);
revoke all on public.stages, public.units, public.lessons, public.situations, public.mistakes
  from anon, authenticated;
grant select on public.stages, public.units, public.situations, public.mistakes to anon, authenticated;
-- lessons.private (task model answers) stays server-only.
grant select (id, unit_id, slug, sort, kind, title_en, title_vi, est_minutes, xp, pass_pct,
  question_count, body, dialogue_id) on public.lessons to anon, authenticated;

revoke all on public.lesson_questions, public.lesson_runs from anon, authenticated;

create policy "lesson progress own" on public.user_lesson_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "unit progress own" on public.user_unit_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "certificates own" on public.certificates for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.user_lesson_progress, public.user_unit_progress,
  public.certificates from anon, authenticated;

grant update (daily_goal_xp, goal_reason) on public.profiles to authenticated;

-- ===== XP ledger without coins/levels; streak follows the learner's daily goal =====
drop function if exists public.svc_award_xp(uuid, int, public.xp_reason, text, text, text, int, jsonb);
drop function if exists private.award_xp(uuid, int, public.xp_reason, text, text, text, int, jsonb);

create function private.award_xp(
  p_user uuid,
  p_amount int,
  p_reason public.xp_reason,
  p_key text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_metadata jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_today date;
  v_event_id bigint;
  v_day_xp int;
  v_goal_met boolean := false;
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
    select coalesce(xp, 0) into v_day_xp from public.daily_activity
      where user_id = p_user and local_date = v_today;
    return jsonb_build_object('duplicate', true, 'xp_total', v_profile.xp_total,
      'streak', v_profile.streak_current, 'day_xp', coalesce(v_day_xp, 0),
      'daily_goal', v_profile.daily_goal_xp, 'goal_met_now', false);
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

  -- A streak day counts once the learner reaches their daily goal.
  if v_day_xp >= v_profile.daily_goal_xp and v_profile.streak_last_date is distinct from v_today then
    v_goal_met := true;
    if v_profile.streak_last_date = v_today - 1 then
      v_profile.streak_current := v_profile.streak_current + 1;
    elsif v_profile.streak_last_date = v_today - 2 and v_profile.streak_freezes > 0 then
      v_profile.streak_freezes := v_profile.streak_freezes - 1;  -- a freeze covers the missed day
      v_profile.streak_current := v_profile.streak_current + 1;
    else
      v_profile.streak_current := 1;
    end if;
    -- One free streak freeze every 7 days, holding at most 2.
    if v_profile.streak_current % 7 = 0 then
      v_profile.streak_freezes := least(2, v_profile.streak_freezes + 1);
    end if;
    v_profile.streak_last_date := v_today;
    v_profile.streak_longest := greatest(v_profile.streak_longest, v_profile.streak_current);
  end if;

  update public.profiles set
    xp_total = v_profile.xp_total,
    streak_current = v_profile.streak_current,
    streak_longest = v_profile.streak_longest,
    streak_last_date = v_profile.streak_last_date,
    streak_freezes = v_profile.streak_freezes
  where id = p_user;

  return jsonb_build_object(
    'duplicate', false,
    'xp_total', v_profile.xp_total,
    'streak', v_profile.streak_current,
    'day_xp', v_day_xp,
    'daily_goal', v_profile.daily_goal_xp,
    'goal_met_now', v_goal_met
  );
end;
$$;

-- Answers only earn XP in free practice; lessons, checkpoints and placement pay on completion.
create or replace function private.record_attempt(
  p_delivery uuid,
  p_user uuid,
  p_response jsonb,
  p_is_correct boolean,
  p_max_attempts int default 2
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d public.question_deliveries;
  s public.quiz_sessions;
  v_attempt int;
  v_final boolean;
  v_xp int := 0;
  v_latency int;
  v_repeat boolean;
  v_today_quiz int;
  v_tz text;
  v_award jsonb := null;
  v_session_done boolean := false;
begin
  select * into d from public.question_deliveries where id = p_delivery for update;
  if not found or d.user_id <> p_user then
    raise exception 'delivery not found' using errcode = 'P0002';
  end if;
  if d.answered_at is not null then
    raise exception 'already answered' using errcode = 'P0001', hint = 'ALREADY_ANSWERED';
  end if;
  if d.expires_at < now() then
    raise exception 'delivery expired' using errcode = 'P0001', hint = 'DELIVERY_EXPIRED';
  end if;

  v_attempt := d.attempts + 1;
  v_final := p_is_correct or v_attempt >= p_max_attempts;
  update public.question_deliveries set attempts = v_attempt where id = d.id;

  if not v_final then
    return jsonb_build_object('final', false, 'attempt', v_attempt, 'correct', false, 'xp', 0);
  end if;

  v_latency := greatest(0, (extract(epoch from (now() - d.served_at)) * 1000)::int);
  if d.session_id is not null then
    select * into s from public.quiz_sessions where id = d.session_id;
  end if;

  if p_is_correct and s.kind = 'practice' then
    select exists (
      select 1 from public.user_answers ua
      where ua.user_id = p_user and ua.question_id = d.question_id and ua.is_correct
        and ua.created_at > now() - interval '14 days'
    ) into v_repeat;
    select timezone into v_tz from public.profiles where id = p_user;
    select coalesce(xp_quiz, 0) into v_today_quiz from public.daily_activity
      where user_id = p_user and local_date = private.local_date(v_tz);
    v_xp := case when v_attempt = 1 and not d.hint_used then 5 else 2 end;
    if v_repeat or v_latency < 800 then v_xp := 0; end if;
    v_xp := least(v_xp, greatest(0, 200 - coalesce(v_today_quiz, 0)));
  end if;

  update public.question_deliveries set answered_at = now(), correct = p_is_correct where id = d.id;
  insert into public.user_answers (delivery_id, user_id, question_id, question_version_id, response,
    is_correct, attempts, latency_ms, xp_awarded)
  values (d.id, p_user, d.question_id, d.question_version_id, p_response, p_is_correct, v_attempt, v_latency, v_xp);
  update public.questions set served_count = served_count + 1,
    correct_count = correct_count + case when p_is_correct then 1 else 0 end
  where id = d.question_id;

  if v_xp > 0 then
    v_award := private.award_xp(p_user, v_xp, 'quiz_correct', 'answer:' || d.id::text, 'question',
      d.question_id::text);
  end if;

  if d.session_id is not null then
    update public.quiz_sessions set
      answered_count = answered_count + 1,
      correct_count = correct_count + case when p_is_correct then 1 else 0 end,
      finished_at = case when answered_count + 1 >= planned_count then now() else null end
    where id = d.session_id
    returning * into s;
    v_session_done := s.finished_at is not null;
  end if;

  return jsonb_build_object(
    'final', true,
    'attempt', v_attempt,
    'correct', p_is_correct,
    'xp', v_xp,
    'award', v_award,
    'session', case when d.session_id is null then null else jsonb_build_object(
      'answered', s.answered_count, 'correct', s.correct_count, 'total', s.planned_count,
      'done', v_session_done) end
  );
end;
$$;

-- ===== lesson completion =====
-- Grades a lesson run from server-side evidence only, then records stars, XP and unit completion.
--   quiz: the run's session must be finished; score = correct / planned.
--   dialogue: the dialogue run must be completed.   task: the task must have been graded (0-3).
-- First completion pays the lesson's XP; a replay pays 30% at most once per day.
create function private.complete_lesson(p_user uuid, p_run uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.lesson_runs;
  l public.lessons;
  s public.quiz_sessions;
  v_pct int := 100;
  v_passed boolean;
  v_stars int := 0;
  v_first boolean;
  v_xp int := 0;
  v_award jsonb := null;
  v_tz text;
  v_unit_done boolean := false;
  v_next_unit int;
begin
  select * into r from public.lesson_runs where id = p_run for update;
  if not found or r.user_id <> p_user then
    raise exception 'run not found' using errcode = 'P0002';
  end if;
  if r.finished_at is not null then
    return r.result || jsonb_build_object('duplicate', true);
  end if;
  select * into l from public.lessons where id = r.lesson_id;

  if l.question_count > 0 then
    select * into s from public.quiz_sessions where id = r.quiz_session_id and user_id = p_user;
    if not found or s.finished_at is null then
      raise exception 'quiz not finished' using errcode = 'P0001', hint = 'QUIZ_NOT_FINISHED';
    end if;
    v_pct := round(100.0 * s.correct_count / greatest(1, s.planned_count));
  end if;
  if l.kind = 'dialogue' and not exists (
    select 1 from public.dialogue_runs dr
    where dr.id = r.dialogue_run_id and dr.user_id = p_user and dr.completed_at is not null
  ) then
    raise exception 'dialogue not finished' using errcode = 'P0001', hint = 'DIALOGUE_NOT_FINISHED';
  end if;
  if l.kind = 'task' then
    if r.task_score is null then
      raise exception 'task not graded' using errcode = 'P0001', hint = 'TASK_NOT_GRADED';
    end if;
    v_pct := least(v_pct, (array[0, 65, 85, 100])[r.task_score + 1]);
  end if;

  v_passed := v_pct >= l.pass_pct;
  if v_passed then
    v_stars := case when v_pct >= 90 then 3 when v_pct >= 75 then 2 else 1 end;
  end if;

  select completed_at is null into v_first from public.user_lesson_progress
    where user_id = p_user and lesson_id = l.id;
  v_first := coalesce(v_first, true);

  insert into public.user_lesson_progress (user_id, lesson_id, stars, best_pct, attempts, completed_at, last_at)
  values (p_user, l.id, v_stars, v_pct, 1, case when v_passed then now() end, now())
  on conflict (user_id, lesson_id) do update set
    stars = greatest(public.user_lesson_progress.stars, excluded.stars),
    best_pct = greatest(public.user_lesson_progress.best_pct, excluded.best_pct),
    attempts = public.user_lesson_progress.attempts + 1,
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at),
    last_at = now();

  if v_passed then
    select timezone into v_tz from public.profiles where id = p_user;
    if v_first then
      v_xp := l.xp;
      v_award := private.award_xp(p_user, v_xp, 'lesson_complete', 'lesson:' || l.id, 'lesson', l.id::text);
    else
      v_xp := round(l.xp * 0.3);
      v_award := private.award_xp(p_user, v_xp, 'lesson_complete',
        'lesson:' || l.id || ':' || private.local_date(v_tz), 'lesson', l.id::text);
      if (v_award ->> 'duplicate')::boolean then v_xp := 0; end if;
    end if;

    -- Unit complete once every lesson of the unit is completed.
    if not exists (select 1 from public.user_unit_progress where user_id = p_user and unit_id = l.unit_id)
       and not exists (
         select 1 from public.lessons x
         left join public.user_lesson_progress p on p.lesson_id = x.id and p.user_id = p_user
         where x.unit_id = l.unit_id and p.completed_at is null
       ) then
      insert into public.user_unit_progress (user_id, unit_id, via) values (p_user, l.unit_id, 'lessons');
      v_unit_done := true;
      v_next_unit := private.next_unit(l.unit_id);
      update public.profiles set current_unit_id = coalesce(v_next_unit, l.unit_id) where id = p_user;
    end if;
  end if;

  update public.lesson_runs set finished_at = now(), result = jsonb_build_object(
    'passed', v_passed, 'pct', v_pct, 'stars', v_stars, 'xp', v_xp, 'first', v_first and v_passed,
    'unit_completed', v_unit_done, 'award', v_award)
  where id = r.id
  returning result into r.result;
  return r.result || jsonb_build_object('duplicate', false);
end;
$$;

-- Next published unit along the path (stage order, then unit order).
create function private.next_unit(p_unit int) returns int
language sql stable security definer set search_path = '' as $$
  select u2.id from public.units u
  join public.stages s on s.id = u.stage_id
  join public.units u2 on true
  join public.stages s2 on s2.id = u2.stage_id
  where u.id = p_unit and u2.status = 'published'
    and (s2.sort, u2.sort) > (s.sort, u.sort)
  order by s2.sort, u2.sort
  limit 1;
$$;

-- Skip a unit by passing its test-out quiz (>= 80%). No lesson XP.
create function private.test_out_unit(p_user uuid, p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.quiz_sessions; v_unit int; v_pct int; v_passed boolean;
begin
  select * into s from public.quiz_sessions where id = p_session and user_id = p_user and kind = 'test_out';
  if not found then raise exception 'session not found' using errcode = 'P0002'; end if;
  if s.finished_at is null then
    raise exception 'quiz not finished' using errcode = 'P0001', hint = 'QUIZ_NOT_FINISHED';
  end if;
  v_unit := split_part(s.ref, ':', 2)::int;
  v_pct := round(100.0 * s.correct_count / greatest(1, s.planned_count));
  v_passed := v_pct >= 80;
  if v_passed then
    insert into public.user_unit_progress (user_id, unit_id, via) values (p_user, v_unit, 'test_out')
    on conflict do nothing;
    update public.profiles set current_unit_id = coalesce(private.next_unit(v_unit), v_unit)
    where id = p_user;
  end if;
  return jsonb_build_object('passed', v_passed, 'pct', v_pct, 'unit_id', v_unit);
end;
$$;

-- Checkpoint: pass the stage exam → certificate (once) + XP.
create function private.pass_checkpoint(p_user uuid, p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.quiz_sessions; st public.stages; v_pct int; v_passed boolean; v_cert uuid; v_award jsonb;
begin
  select * into s from public.quiz_sessions where id = p_session and user_id = p_user and kind = 'checkpoint';
  if not found then raise exception 'session not found' using errcode = 'P0002'; end if;
  if s.finished_at is null then
    raise exception 'quiz not finished' using errcode = 'P0001', hint = 'QUIZ_NOT_FINISHED';
  end if;
  select * into st from public.stages where id = split_part(s.ref, ':', 2)::int;
  v_pct := round(100.0 * s.correct_count / greatest(1, s.planned_count));
  v_passed := v_pct >= st.checkpoint_pass_pct;
  if v_passed then
    insert into public.certificates (user_id, stage_id, score_pct) values (p_user, st.id, v_pct)
    on conflict (user_id, stage_id) do update set score_pct = greatest(public.certificates.score_pct, excluded.score_pct)
    returning id into v_cert;
    v_award := private.award_xp(p_user, 100, 'checkpoint_pass', 'checkpoint:' || st.id, 'stage', st.id::text);
  end if;
  return jsonb_build_object('passed', v_passed, 'pct', v_pct, 'stage_id', st.id,
    'certificate_id', v_cert, 'award', v_award);
end;
$$;

-- Placement: mark every unit before `p_unit` as done and start there. Only once per learner.
create function private.place_user(p_user uuid, p_unit int, p_cefr public.cefr_level) returns void
language plpgsql security definer set search_path = '' as $$
declare v_stage int; v_sort int;
begin
  if exists (select 1 from public.profiles where id = p_user and placement_level is not null) then
    raise exception 'already placed' using errcode = 'P0001', hint = 'ALREADY_DONE';
  end if;
  select s.sort, u.sort into v_stage, v_sort from public.units u join public.stages s on s.id = u.stage_id
    where u.id = p_unit;
  insert into public.user_unit_progress (user_id, unit_id, via)
  select p_user, u.id, 'placement' from public.units u join public.stages s on s.id = u.stage_id
  where (s.sort, u.sort) < (v_stage, v_sort)
  on conflict do nothing;
  update public.profiles set placement_level = p_cefr, target_level = p_cefr, current_unit_id = p_unit
  where id = p_user;
end;
$$;

-- Public certificate page: learner's display name and stage only.
create function public.get_certificate(p_id uuid)
returns table (id uuid, display_name text, stage_slug text, stage_sort smallint, stage_title_en text,
  stage_title_vi text, cefr public.cefr_level, score_pct smallint, issued_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, coalesce(p.display_name, 'DevQuest learner'), s.slug, s.sort, s.title_en, s.title_vi, s.cefr,
    c.score_pct, c.issued_at
  from public.certificates c
  join public.stages s on s.id = c.stage_id
  join public.profiles p on p.id = c.user_id
  where c.id = p_id;
$$;
revoke all on function public.get_certificate(uuid) from public;
grant execute on function public.get_certificate(uuid) to anon, authenticated;

-- Guest → account merge without the game economy; keeps path progress.
create or replace function private.merge_guest(p_from uuid, p_to uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_xp int; v_cards int; v_left int; v_i int := 0;
begin
  if not exists (select 1 from auth.users where id = p_from and is_anonymous) then
    raise exception 'source is not a guest' using errcode = 'P0001', hint = 'NOT_GUEST';
  end if;
  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = p_from;
  -- The ledger caps one event at 5000 XP, so large balances move in chunks.
  v_left := v_xp;
  while v_left > 0 loop
    perform private.award_xp(p_to, least(v_left, 5000), 'merge', 'merge:' || p_from::text || ':' || v_i,
      'user', p_from::text);
    v_left := v_left - 5000;
    v_i := v_i + 1;
  end loop;
  insert into public.user_cards (user_id, sense_id, state, due, stability, difficulty, elapsed_days, scheduled_days,
    learning_steps, reps, lapses, last_review, added_via, added_at)
  select p_to, sense_id, state, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses,
    last_review, added_via, added_at from public.user_cards where user_id = p_from
  on conflict (user_id, sense_id) do update set
    state = excluded.state, due = excluded.due, stability = excluded.stability, difficulty = excluded.difficulty,
    reps = excluded.reps, lapses = excluded.lapses, last_review = excluded.last_review
  where excluded.reps > public.user_cards.reps;
  get diagnostics v_cards = row_count;
  insert into public.user_lesson_progress (user_id, lesson_id, stars, best_pct, attempts, completed_at, last_at)
    select p_to, lesson_id, stars, best_pct, attempts, completed_at, last_at
    from public.user_lesson_progress where user_id = p_from
  on conflict (user_id, lesson_id) do update set
    stars = greatest(public.user_lesson_progress.stars, excluded.stars),
    best_pct = greatest(public.user_lesson_progress.best_pct, excluded.best_pct),
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at);
  insert into public.user_unit_progress (user_id, unit_id, via, completed_at)
    select p_to, unit_id, via, completed_at from public.user_unit_progress where user_id = p_from
  on conflict do nothing;
  insert into public.certificates (user_id, stage_id, score_pct, issued_at)
    select p_to, stage_id, score_pct, issued_at from public.certificates where user_id = p_from
  on conflict do nothing;
  update public.profiles t set
    current_unit_id = coalesce(t.current_unit_id, f.current_unit_id),
    placement_level = coalesce(t.placement_level, f.placement_level)
  from public.profiles f where t.id = p_to and f.id = p_from;
  update public.dialogue_runs set user_id = p_to where user_id = p_from;
  delete from auth.users where id = p_from;
  return jsonb_build_object('xp', v_xp, 'cards', v_cards);
end;
$$;

-- ===== service-role entry points =====
create function public.svc_award_xp(
  p_user uuid, p_amount int, p_reason public.xp_reason, p_key text,
  p_ref_type text default null, p_ref_id text default null, p_metadata jsonb default '{}'
) returns jsonb
language sql security definer set search_path = '' as $$
  select private.award_xp(p_user, p_amount, p_reason, p_key, p_ref_type, p_ref_id, p_metadata);
$$;
create function public.svc_complete_lesson(p_user uuid, p_run uuid) returns jsonb
language sql security definer set search_path = '' as $$ select private.complete_lesson(p_user, p_run); $$;
create function public.svc_test_out_unit(p_user uuid, p_session uuid) returns jsonb
language sql security definer set search_path = '' as $$ select private.test_out_unit(p_user, p_session); $$;
create function public.svc_pass_checkpoint(p_user uuid, p_session uuid) returns jsonb
language sql security definer set search_path = '' as $$ select private.pass_checkpoint(p_user, p_session); $$;
create function public.svc_place_user(p_user uuid, p_unit int, p_cefr public.cefr_level) returns void
language sql security definer set search_path = '' as $$ select private.place_user(p_user, p_unit, p_cefr); $$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
do $$
declare f text;
begin
  foreach f in array array[
    'public.svc_award_xp(uuid, int, public.xp_reason, text, text, text, jsonb)',
    'public.svc_complete_lesson(uuid, uuid)', 'public.svc_test_out_unit(uuid, uuid)',
    'public.svc_pass_checkpoint(uuid, uuid)', 'public.svc_place_user(uuid, int, public.cefr_level)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
