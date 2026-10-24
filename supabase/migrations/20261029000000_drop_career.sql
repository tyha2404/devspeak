-- The workplace ("career") path was removed from the app: drop its content, tables, columns and
-- functions, and narrow the enums to the two study tracks. Learner history that the tracks still use
-- (XP ledger, answers, SRS cards, vocabulary and question bank) is kept.

-- ===== content of the career path (cascades to units, lessons, lesson questions, progress, runs) =====
delete from public.stages where track = 'career';

-- ===== functions, rewritten for the study tracks only =====

-- Grades a lesson run from its finished quiz session, then records stars, XP and unit completion.
-- Every pass pays 35 + 15 × stars (one award per run); any finished test counts the day's streak.
create or replace function private.complete_lesson(p_user uuid, p_run uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.lesson_runs;
  l public.lessons;
  s public.quiz_sessions;
  v_pct int;
  v_passed boolean;
  v_stars int := 0;
  v_first boolean;
  v_xp int := 0;
  v_award jsonb := null;
  v_unit_done boolean := false;
begin
  select * into r from public.lesson_runs where id = p_run for update;
  if not found or r.user_id <> p_user then
    raise exception 'run not found' using errcode = 'P0002';
  end if;
  if r.finished_at is not null then
    return r.result || jsonb_build_object('duplicate', true);
  end if;
  select * into l from public.lessons where id = r.lesson_id;

  select * into s from public.quiz_sessions where id = r.quiz_session_id and user_id = p_user;
  if not found or s.finished_at is null then
    raise exception 'quiz not finished' using errcode = 'P0001', hint = 'QUIZ_NOT_FINISHED';
  end if;
  v_pct := round(100.0 * s.correct_count / greatest(1, s.planned_count));

  v_passed := v_pct >= l.pass_pct;
  if v_passed then
    v_stars := case when v_pct >= 100 then 3 when v_pct >= 90 then 2 else 1 end;
  end if;

  select completed_at is null into v_first from public.user_lesson_progress
    where user_id = p_user and lesson_id = l.id;
  v_first := coalesce(v_first, true);

  insert into public.user_lesson_progress (user_id, lesson_id, stars, best_pct, attempts, completed_at, last_at,
    last_pct, last_correct, last_total)
  values (p_user, l.id, v_stars, v_pct, 1, case when v_passed then now() end, now(),
    v_pct, s.correct_count, s.planned_count)
  on conflict (user_id, lesson_id) do update set
    last_pct = excluded.last_pct,
    last_correct = excluded.last_correct,
    last_total = excluded.last_total,
    stars = greatest(public.user_lesson_progress.stars, excluded.stars),
    best_pct = greatest(public.user_lesson_progress.best_pct, excluded.best_pct),
    attempts = public.user_lesson_progress.attempts + 1,
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at),
    last_at = now();

  perform private.touch_streak(p_user);

  if v_passed then
    v_xp := 35 + 15 * v_stars;
    v_award := private.award_xp(p_user, v_xp, 'lesson_complete', 'lesson:' || l.id || ':run:' || r.id,
      'lesson', l.id::text);

    -- Unit complete once every lesson of the unit is completed.
    if not exists (select 1 from public.user_unit_progress where user_id = p_user and unit_id = l.unit_id)
       and not exists (
         select 1 from public.lessons x
         left join public.user_lesson_progress p on p.lesson_id = x.id and p.user_id = p_user
         where x.unit_id = l.unit_id and p.completed_at is null
       ) then
      insert into public.user_unit_progress (user_id, unit_id, via) values (p_user, l.unit_id, 'lessons');
      v_unit_done := true;
    end if;
  end if;

  update public.lesson_runs set finished_at = now(), result = jsonb_build_object(
    'passed', v_passed, 'pct', v_pct, 'stars', v_stars, 'xp', v_xp, 'first', v_first and v_passed,
    'unit_completed', v_unit_done, 'award', v_award, 'correct', s.correct_count, 'total', s.planned_count)
  where id = r.id
  returning result into r.result;
  return r.result || jsonb_build_object('duplicate', false);
end;
$$;

-- A level test-out: 80% records the level as done (opening the next one) and pays 120 XP per pass.
create or replace function private.test_out_unit(p_user uuid, p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.quiz_sessions; v_unit int; v_pct int; v_passed boolean; v_award jsonb := null; v_xp int := 0;
begin
  select * into s from public.quiz_sessions where id = p_session and user_id = p_user and kind = 'test_out';
  if not found then raise exception 'session not found' using errcode = 'P0002'; end if;
  if s.finished_at is null then
    raise exception 'quiz not finished' using errcode = 'P0001', hint = 'QUIZ_NOT_FINISHED';
  end if;
  v_unit := split_part(s.ref, ':', 2)::int;
  v_pct := round(100.0 * s.correct_count / greatest(1, s.planned_count));
  v_passed := v_pct >= 80;
  perform private.touch_streak(p_user);
  if v_passed then
    insert into public.user_unit_progress (user_id, unit_id, via) values (p_user, v_unit, 'test_out')
    on conflict do nothing;
    v_award := private.award_xp(p_user, 120, 'lesson_complete', 'test_out:' || v_unit || ':' || s.id,
      'unit', v_unit::text);
    v_xp := case when (v_award ->> 'duplicate')::boolean then 0 else 120 end;
  end if;
  return jsonb_build_object('passed', v_passed, 'pct', v_pct, 'unit_id', v_unit, 'xp', v_xp,
    'correct', s.correct_count, 'total', s.planned_count, 'award', v_award);
end;
$$;

-- Guest → account merge: XP, cards, lesson and unit progress move over; the guest is deleted.
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
  insert into public.user_lesson_progress (user_id, lesson_id, stars, best_pct, attempts, completed_at, last_at,
    last_pct, last_correct, last_total)
    select p_to, lesson_id, stars, best_pct, attempts, completed_at, last_at, last_pct, last_correct, last_total
    from public.user_lesson_progress where user_id = p_from
  on conflict (user_id, lesson_id) do update set
    stars = greatest(public.user_lesson_progress.stars, excluded.stars),
    best_pct = greatest(public.user_lesson_progress.best_pct, excluded.best_pct),
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at);
  insert into public.user_unit_progress (user_id, unit_id, via, completed_at)
    select p_to, unit_id, via, completed_at from public.user_unit_progress where user_id = p_from
  on conflict do nothing;
  delete from auth.users where id = p_from;
  return jsonb_build_object('xp', v_xp, 'cards', v_cards);
end;
$$;

-- Daily cleanup (cron): expired deliveries, old rate-limit windows, idle guests, suspicious items.
create or replace function private.housekeeping() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_deliveries int; v_limits int; v_guests int; v_flagged int;
begin
  delete from public.question_deliveries where answered_at is null and expires_at < now() - interval '7 days';
  get diagnostics v_deliveries = row_count;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_limits = row_count;
  -- Guests inactive for 30 days (no XP and no sign-in).
  delete from auth.users u where u.is_anonymous and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
    and not exists (select 1 from public.xp_events e where e.user_id = u.id and e.created_at > now() - interval '30 days');
  get diagnostics v_guests = row_count;
  -- Items that almost everyone fails or passes are probably broken or trivial: back to review.
  update public.questions set status = 'in_review'
  where status = 'published' and served_count >= 30
    and (correct_count::numeric / served_count < 0.15 or correct_count::numeric / served_count > 0.98);
  get diagnostics v_flagged = row_count;
  return jsonb_build_object('expired_deliveries', v_deliveries, 'rate_limit_rows', v_limits, 'guests_removed', v_guests,
    'questions_to_review', v_flagged);
end;
$$;

-- Functions of the career path, NPC chat, placement, checkpoints and certificates.
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'private' and p.proname in
            ('chat_turn', 'purge_chat_logs', 'pass_checkpoint', 'place_user', 'next_unit', 'unit_track'))
       or (n.nspname = 'public' and p.proname in
            ('svc_chat_turn', 'svc_purge_chat_logs', 'svc_pass_checkpoint', 'svc_place_user', 'get_certificate'))
  loop
    execute format('drop function %s', f);
  end loop;
end $$;

-- ===== tables and columns =====
alter table public.lessons drop column dialogue_id, drop column private;
alter table public.lesson_runs drop column dialogue_run_id, drop column task_score, drop column task_feedback;
alter table public.units drop column character, drop column roleplay;
alter table public.stages drop column checkpoint_size, drop column checkpoint_pass_pct;
alter table public.profiles
  drop column current_unit_id,
  drop column placement_level,
  drop column target_level,
  drop column goal_reason,
  drop column onboarded_at,
  drop column ui_locale;
alter table public.quiz_sessions drop column npc_id;

drop table public.certificates, public.chat_messages, public.chat_sessions, public.dialogue_runs,
  public.dialogues, public.mistakes, public.situations;

-- ===== enums narrowed to the study tracks =====
alter table public.stages alter column track drop default;
create type public.study_track_v2 as enum ('grammar', 'vocab');
alter table public.stages alter column track type public.study_track_v2 using track::text::public.study_track_v2;
drop type public.study_track;
alter type public.study_track_v2 rename to study_track;

create type public.unit_kind_v2 as enum ('grammar', 'topic');
alter table public.units alter column kind type public.unit_kind_v2 using kind::text::public.unit_kind_v2;
drop type public.unit_kind;
alter type public.unit_kind_v2 rename to unit_kind;

create type public.lesson_kind_v2 as enum ('vocab', 'grammar');
alter table public.lessons alter column kind type public.lesson_kind_v2 using kind::text::public.lesson_kind_v2;
drop type public.lesson_kind;
alter type public.lesson_kind_v2 rename to lesson_kind;
