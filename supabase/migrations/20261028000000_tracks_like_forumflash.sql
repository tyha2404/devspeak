-- Study tracks behave exactly like ForumFlash:
--   * CEFR C2 exists (the grammar track runs A1 → C2);
--   * every passed track test pays its XP (35 + 15 × stars; a level test-out 120), not just the first;
--   * finishing any track test (passed or not) counts the day for the streak: yesterday → +1,
--     today → unchanged, otherwise the streak restarts at 1. The career path keeps its daily-goal rule.

alter type public.cefr_level add value if not exists 'C2';

create function private.touch_streak(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles; v_today date;
begin
  select * into v_profile from public.profiles where id = p_user for update;
  if not found then return; end if;
  v_today := private.local_date(v_profile.timezone);
  if v_profile.streak_last_date = v_today then return; end if;
  update public.profiles set
    streak_current = case when streak_last_date = v_today - 1 then streak_current + 1 else 1 end,
    streak_longest = greatest(streak_longest,
      case when streak_last_date = v_today - 1 then streak_current + 1 else 1 end),
    streak_last_date = v_today
  where id = p_user;
end;
$$;
revoke all on function private.touch_streak(uuid) from public, anon, authenticated;
grant execute on function private.touch_streak(uuid) to service_role;

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
  v_track public.study_track;
  v_correct int := null;
  v_total int := null;
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
    v_correct := s.correct_count;
    v_total := s.planned_count;
  end if;
  v_track := private.unit_track(l.unit_id);
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
    -- Study tracks score like ForumFlash: a perfect test is 3 stars, 90%+ is 2, a pass is 1.
    v_stars := case
      when v_track <> 'career' then case when v_pct >= 100 then 3 when v_pct >= 90 then 2 else 1 end
      when v_pct >= 90 then 3 when v_pct >= 75 then 2 else 1 end;
  end if;

  select completed_at is null into v_first from public.user_lesson_progress
    where user_id = p_user and lesson_id = l.id;
  v_first := coalesce(v_first, true);

  insert into public.user_lesson_progress (user_id, lesson_id, stars, best_pct, attempts, completed_at, last_at,
    last_pct, last_correct, last_total)
  values (p_user, l.id, v_stars, v_pct, 1, case when v_passed then now() end, now(), v_pct, v_correct, v_total)
  on conflict (user_id, lesson_id) do update set
    last_pct = excluded.last_pct,
    last_correct = excluded.last_correct,
    last_total = excluded.last_total,
    stars = greatest(public.user_lesson_progress.stars, excluded.stars),
    best_pct = greatest(public.user_lesson_progress.best_pct, excluded.best_pct),
    attempts = public.user_lesson_progress.attempts + 1,
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at),
    last_at = now();

  -- Study tracks: any finished test keeps the day's streak, passed or not.
  if v_track <> 'career' then
    perform private.touch_streak(p_user);
  end if;

  if v_passed and v_track <> 'career' then
    -- Every pass pays its stars in full, like ForumFlash (one award per run).
    v_xp := 35 + 15 * v_stars;
    v_award := private.award_xp(p_user, v_xp, 'lesson_complete', 'lesson:' || l.id || ':run:' || r.id,
      'lesson', l.id::text);
  elsif v_passed then
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
  end if;

  if v_passed then
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
    'unit_completed', v_unit_done, 'award', v_award, 'correct', v_correct, 'total', v_total)
  where id = r.id
  returning result into r.result;
  return r.result || jsonb_build_object('duplicate', false);
end;
$$;




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
  if private.unit_track(v_unit) <> 'career' then
    perform private.touch_streak(p_user);
  end if;
  v_passed := v_pct >= 80;
  if v_passed then
    insert into public.user_unit_progress (user_id, unit_id, via) values (p_user, v_unit, 'test_out')
    on conflict do nothing;
    -- A study-track level test-out pays 120 XP every time it is passed.
    if private.unit_track(v_unit) <> 'career' then
      v_award := private.award_xp(p_user, 120, 'lesson_complete', 'test_out:' || v_unit || ':' || s.id,
        'unit', v_unit::text);
      v_xp := case when (v_award ->> 'duplicate')::boolean then 0 else 120 end;
    end if;
    if private.unit_track(v_unit) = 'career' then
      update public.profiles set current_unit_id = coalesce(private.next_unit(v_unit), v_unit)
      where id = p_user;
    end if;
  end if;
  return jsonb_build_object('passed', v_passed, 'pct', v_pct, 'unit_id', v_unit, 'xp', v_xp,
    'correct', s.correct_count, 'total', s.planned_count, 'award', v_award);
end;
$$;


