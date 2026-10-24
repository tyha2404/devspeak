-- Guest → account merge also carries the learning history (tests, answers, lesson runs, reviews),
-- so a learner who signs up keeps their accuracy and lesson results, not only XP and progress.
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
  -- The learning history (tests, answers, lesson runs, reviews) moves too, so accuracy and
  -- lesson results survive the merge.
  update public.quiz_sessions set user_id = p_to where user_id = p_from;
  update public.question_deliveries set user_id = p_to where user_id = p_from;
  update public.user_answers set user_id = p_to where user_id = p_from;
  update public.lesson_runs set user_id = p_to where user_id = p_from;
  update public.review_logs set user_id = p_to where user_id = p_from;
  delete from auth.users where id = p_from;
  return jsonb_build_object('xp', v_xp, 'cards', v_cards);
end;
$$;
