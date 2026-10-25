begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- ----- fixtures: a grammar stage with two levels; level 1 has two lessons -----
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'g@test.dev'),
  ('00000000-0000-0000-0000-0000000000a8', 'h@test.dev');

insert into public.stages (slug, sort, track, cefr, title_en, title_vi, tagline_vi, description_vi)
values ('tt-grammar', 989, 'grammar', 'A1', 'G', 'G', 't', 't');
insert into public.units (stage_id, slug, sort, code, kind, cefr, title_en, title_vi, summary_vi, status)
select s.id, x.slug, x.sort, x.code, 'grammar', 'A1', 'U', 'U', 's', 'published'
from (values ('tt-g1', 1, 'A1'), ('tt-g2', 2, 'A2')) x(slug, sort, code), public.stages s
where s.slug = 'tt-grammar';
insert into public.lessons (unit_id, slug, sort, kind, title_en, title_vi, est_minutes, xp, pass_pct, question_count)
select u.id, x.slug, x.sort, 'grammar', 'L', 'L', 10, 80, 80, 10
from (values ('tt-g1-a', 1), ('tt-g1-b', 2)) x(slug, sort), public.units u where u.slug = 'tt-g1';

-- Finished 10-question tests: 10/10 (run 1), 9/10 (run 2, same lesson), 5/10 (run 3), and one
-- unfinished (run 4); a passed and a failed test-out of level 2.
insert into public.quiz_sessions (id, user_id, kind, ref, question_ids, planned_count, answered_count, correct_count, finished_at)
values
  ('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-0000000000a7', 'lesson', null, '{}', 10, 10, 10, now()),
  ('00000000-0000-0000-0000-00000000ac02', '00000000-0000-0000-0000-0000000000a7', 'lesson', null, '{}', 10, 10, 9, now()),
  ('00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-0000000000a7', 'lesson', null, '{}', 10, 10, 5, now()),
  ('00000000-0000-0000-0000-00000000ac04', '00000000-0000-0000-0000-0000000000a7', 'lesson', null, '{}', 10, 3, 3, null);
insert into public.quiz_sessions (id, user_id, kind, ref, question_ids, planned_count, answered_count, correct_count, finished_at)
select x.id::uuid, '00000000-0000-0000-0000-0000000000a7', 'test_out', 'unit:' || u.id, '{}', 16, 16, x.correct, now()
from (values ('00000000-0000-0000-0000-00000000ac05', 13), ('00000000-0000-0000-0000-00000000ac06', 12)) x(id, correct),
  public.units u where u.slug = 'tt-g2';
insert into public.lesson_runs (id, user_id, lesson_id, quiz_session_id)
select r.id::uuid, '00000000-0000-0000-0000-0000000000a7', l.id, r.sid::uuid
from (values
  ('00000000-0000-0000-0000-00000000ad01', 'tt-g1-a', '00000000-0000-0000-0000-00000000ac01'),
  ('00000000-0000-0000-0000-00000000ad02', 'tt-g1-a', '00000000-0000-0000-0000-00000000ac02'),
  ('00000000-0000-0000-0000-00000000ad03', 'tt-g1-b', '00000000-0000-0000-0000-00000000ac03'),
  ('00000000-0000-0000-0000-00000000ad04', 'tt-g1-b', '00000000-0000-0000-0000-00000000ac04')) r(id, lesson, sid)
join public.lessons l on l.slug = r.lesson;

-- ----- as a learner -----
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}';

select is((select count(*)::int from public.lessons where slug like 'tt-%'), 2, 'lessons are readable');
select throws_ok($$ select * from public.lesson_questions $$, '42501', null, 'lesson question lists are hidden');
select throws_ok($$ select * from public.lesson_runs $$, '42501', null, 'lesson runs are server-only');
select throws_ok(
  $$ insert into public.user_lesson_progress (user_id, lesson_id, stars) select auth.uid(), id, 3 from public.lessons limit 1 $$,
  '42501', null, 'no self-awarded stars');
select throws_ok($$ update public.quiz_sessions set max_attempts = 3, time_limited = false $$,
  '42501', null, 'learners cannot loosen their own exam rules');
select throws_ok($$ select public.svc_complete_lesson(auth.uid(), '00000000-0000-0000-0000-00000000ad01') $$,
  '42501', null, 'svc_complete_lesson is service-only');
select throws_ok($$ select public.svc_test_out_unit(auth.uid(), '00000000-0000-0000-0000-00000000ac05') $$,
  '42501', null, 'svc_test_out_unit is service-only');

-- ----- as the service role -----
reset role;
set local role service_role;

select throws_ok($$ select public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-00000000ad01') $$,
  'P0002', null, 'another learner cannot complete my run');
select throws_ok($$ select public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-00000000ad04') $$,
  'P0001', null, 'an unfinished test cannot complete a lesson');

create temp table r1 as select public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ad01') as v;
select is((select (v ->> 'stars')::int from r1), 3, 'a perfect test is 3 stars');
select is((select (v ->> 'xp')::int from r1), 80, 'and pays 35 + 15 × 3');
select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ad01') ->> 'duplicate')::boolean, true, 'completing a run twice is a no-op');
select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ad02') ->> 'xp')::int, 20, 'a replay below the best stars pays 30% (2★: round(0.3 × 65))');
select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ad03') ->> 'passed')::boolean, false, '50% does not pass');
select ok(not exists (select 1 from public.user_unit_progress p join public.units u on u.id = p.unit_id
  where p.user_id = '00000000-0000-0000-0000-0000000000a7' and u.slug = 'tt-g1'), 'the level is not done yet');
select is((select streak_current from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'), 1,
  'finishing a test starts the streak, passed or not');

insert into public.user_unit_progress (user_id, unit_id, via)
select '00000000-0000-0000-0000-0000000000a7', id, 'lessons' from public.units where slug = 'tt-g2';

select is((public.svc_test_out_unit('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ac05') ->> 'xp')::int, 120, 'a passed test-out (13/16) pays 120 XP');
select is((select p.via from public.user_unit_progress p join public.units u on u.id = p.unit_id
  where p.user_id = '00000000-0000-0000-0000-0000000000a7' and u.slug = 'tt-g2'), 'test_out',
  'passing test-out upgrades a level already completed through lessons');
select is((public.svc_test_out_unit('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ac05') ->> 'xp')::int, 0, 'once per test session');
select is((public.svc_test_out_unit('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ac06') ->> 'passed')::boolean, false, '12/16 (75%) does not pass');
select is((select p.via from public.user_unit_progress p join public.units u on u.id = p.unit_id
  where p.user_id = '00000000-0000-0000-0000-0000000000a7' and u.slug = 'tt-g2'), 'test_out',
  'a later failed test-out does not downgrade the completion method');

select * from finish();
rollback;
