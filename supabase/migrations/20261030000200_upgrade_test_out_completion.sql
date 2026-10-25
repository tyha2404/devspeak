-- A test-out can upgrade a level previously completed through lessons or placement.
-- Preserve completion time and the existing per-session XP idempotency key.
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
    on conflict (user_id, unit_id) do update set via = excluded.via;
    v_award := private.award_xp(p_user, 120, 'lesson_complete', 'test_out:' || v_unit || ':' || s.id,
      'unit', v_unit::text);
    v_xp := case when (v_award ->> 'duplicate')::boolean then 0 else 120 end;
  end if;
  return jsonb_build_object('passed', v_passed, 'pct', v_pct, 'unit_id', v_unit, 'xp', v_xp,
    'correct', s.correct_count, 'total', s.planned_count, 'award', v_award);
end;
$$;
