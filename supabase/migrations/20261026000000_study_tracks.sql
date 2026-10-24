-- Study tracks next to the career path (ForumFlash-style): a grammar track whose units are CEFR
-- levels and whose lessons are grammar points (five study screens + a test), and a vocabulary track
-- whose units are topics and whose lessons are word sets. Both reuse lessons, lesson runs,
-- complete_lesson and unit test-outs; only the career path drives placement, checkpoints and
-- profiles.current_unit_id.

create type public.study_track as enum ('career', 'grammar', 'vocab');
alter table public.stages add column track public.study_track not null default 'career';

alter type public.unit_kind add value if not exists 'grammar';
alter type public.unit_kind add value if not exists 'topic';
alter type public.lesson_kind add value if not exists 'grammar';

create function private.unit_track(p_unit int) returns public.study_track
language sql stable security definer set search_path = '' as $$
  select s.track from public.units u join public.stages s on s.id = u.stage_id where u.id = p_unit;
$$;

-- Next published unit along the same track (stage order, then unit order).
create or replace function private.next_unit(p_unit int) returns int
language sql stable security definer set search_path = '' as $$
  select u2.id from public.units u
  join public.stages s on s.id = u.stage_id
  join public.units u2 on true
  join public.stages s2 on s2.id = u2.stage_id
  where u.id = p_unit and u2.status = 'published' and s2.track = s.track
    and (s2.sort, u2.sort) > (s.sort, u.sort)
  order by s2.sort, u2.sort
  limit 1;
$$;

create or replace function private.complete_lesson(p_user uuid, p_run uuid) returns jsonb
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
      -- Only the career path moves the learner's "current unit"; study tracks are browsed freely.
      if private.unit_track(l.unit_id) = 'career' then
        v_next_unit := private.next_unit(l.unit_id);
        update public.profiles set current_unit_id = coalesce(v_next_unit, l.unit_id) where id = p_user;
      end if;
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


-- Test-outs work in every track (a grammar level's "bài vượt cấp"); only career moves current_unit_id.
create or replace function private.test_out_unit(p_user uuid, p_session uuid) returns jsonb
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
    if private.unit_track(v_unit) = 'career' then
      update public.profiles set current_unit_id = coalesce(private.next_unit(v_unit), v_unit)
      where id = p_user;
    end if;
  end if;
  return jsonb_build_object('passed', v_passed, 'pct', v_pct, 'unit_id', v_unit);
end;
$$;


-- Placement only skips career units; study tracks are untouched.
create or replace function private.place_user(p_user uuid, p_unit int, p_cefr public.cefr_level) returns void
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
  where s.track = 'career' and (s.sort, u.sort) < (v_stage, v_sort)
  on conflict do nothing;
  update public.profiles set placement_level = p_cefr, target_level = p_cefr, current_unit_id = p_unit
  where id = p_user;
end;
$$;


revoke all on function private.unit_track(int) from public, anon, authenticated;
grant execute on function private.unit_track(int) to service_role;
