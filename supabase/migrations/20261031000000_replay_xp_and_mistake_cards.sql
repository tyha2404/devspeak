-- Replay XP and mistakes → SRS.
-- * Lesson pass: the first pass, or a pass that beats the best star count, pays 35 + 15 × stars;
--   any other replay pass pays 30% of that (rounded).
-- * Level test-out: 120 XP only the first time the unit is passed by test-out.
-- * Every finished track test (lesson or test-out) adds an SRS card, due now, for each sense linked to a
--   question not answered correctly in that session (wrong or timed out). Questions without sense_ids
--   (most grammar items) are skipped.

create or replace function private.feed_mistakes(p_user uuid, p_session uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare s public.quiz_sessions; v_n int;
begin
  select * into s from public.quiz_sessions where id = p_session and user_id = p_user;
  if not found then return 0; end if;
  with missed as (
    select distinct unnest(q.sense_ids) as sense_id
    from public.questions q
    where q.id = any (s.question_ids)
      and not exists (select 1 from public.question_deliveries d
        where d.session_id = s.id and d.question_id = q.id and d.correct)
  ), up as (
    insert into public.user_cards (user_id, sense_id, added_via, due)
    select p_user, m.sense_id, 'mistake', now() from missed m
    join public.senses x on x.id = m.sense_id
    on conflict (user_id, sense_id) do update set due = least(public.user_cards.due, now())
    returning 1
  )
  select count(*) into v_n from up;
  return v_n;
end;
$$;

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
  v_prev_stars int;
  v_full boolean;
  v_cards int;
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

  select completed_at is null, stars into v_first, v_prev_stars from public.user_lesson_progress
    where user_id = p_user and lesson_id = l.id;
  v_prev_stars := coalesce(v_prev_stars, 0);
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
  v_cards := private.feed_mistakes(p_user, s.id);

  if v_passed then
    v_full := v_first or v_stars > v_prev_stars;
    v_xp := case when v_full then 35 + 15 * v_stars else round(0.3 * (35 + 15 * v_stars))::int end;
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
    'unit_completed', v_unit_done, 'replay', not v_full, 'review_cards', v_cards, 'award', v_award, 'correct', s.correct_count, 'total', s.planned_count)
  where id = r.id
  returning result into r.result;
  return r.result || jsonb_build_object('duplicate', false);
end;
$$;


create or replace function private.test_out_unit(p_user uuid, p_session uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.quiz_sessions; v_unit int; v_pct int; v_passed boolean; v_award jsonb := null; v_xp int := 0;
  v_cards int;
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
  v_cards := private.feed_mistakes(p_user, s.id);
  if v_passed then
    insert into public.user_unit_progress (user_id, unit_id, via) values (p_user, v_unit, 'test_out')
    on conflict (user_id, unit_id) do update set via = excluded.via;
    -- Serialise concurrent finishes of the same unit, then pay only if no test-out of it paid before.
    perform pg_advisory_xact_lock(hashtext('test_out:' || p_user || ':' || v_unit));
    if not exists (select 1 from public.xp_events e where e.user_id = p_user
                   and e.idempotency_key like 'test_out:' || v_unit || ':%'
                   and e.idempotency_key <> 'test_out:' || v_unit || ':' || s.id) then
      v_award := private.award_xp(p_user, 120, 'lesson_complete', 'test_out:' || v_unit || ':' || s.id,
        'unit', v_unit::text);
      v_xp := case when (v_award ->> 'duplicate')::boolean then 0 else 120 end;
    end if;
  end if;
  return jsonb_build_object('passed', v_passed, 'pct', v_pct, 'unit_id', v_unit, 'xp', v_xp,
    'correct', s.correct_count, 'total', s.planned_count, 'award', v_award, 'review_cards', v_cards);
end;
$$;

revoke all on function private.feed_mistakes(uuid, uuid) from public, anon, authenticated;
grant execute on function private.feed_mistakes(uuid, uuid) to service_role;
