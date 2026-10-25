begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'lp@test.dev');
insert into public.quiz_sessions (id, user_id, kind, question_ids, planned_count, max_attempts, time_limited)
select '00000000-0000-0000-0000-00000000bc01', '00000000-0000-0000-0000-0000000000b1', 'lesson_practice',
  array[q.id], 1, 1, false
from public.questions q where q.status = 'published' and q.current_version_id is not null limit 1;

select is((select kind from public.quiz_sessions where id = '00000000-0000-0000-0000-00000000bc01'),
  'lesson_practice', 'lesson_practice is an allowed session kind');

insert into public.question_deliveries (id, user_id, session_id, question_id, question_version_id, option_map, client_prompt, expires_at)
select '00000000-0000-0000-0000-00000000bd01', s.user_id, s.id, q.id, q.current_version_id, '{}', '{}', now() + interval '10 minutes'
from public.quiz_sessions s, public.questions q
where s.id = '00000000-0000-0000-0000-00000000bc01' and q.id = s.question_ids[1];

select is(
  (public.svc_record_attempt('00000000-0000-0000-0000-00000000bd01', '00000000-0000-0000-0000-0000000000b1',
    '{"kind":"timeout"}', true, 1) ->> 'xp')::int,
  0, 'a correct practice answer awards no XP');
select is((select count(*)::int from public.xp_events where user_id = '00000000-0000-0000-0000-0000000000b1'),
  0, 'no XP ledger rows');
select throws_ok(
  $$insert into public.quiz_sessions (user_id, kind, question_ids, planned_count)
    values ('00000000-0000-0000-0000-0000000000b1', 'bogus', '{}', 1)$$,
  '23514', null, 'unknown kinds are still rejected');

select * from finish();
rollback;
