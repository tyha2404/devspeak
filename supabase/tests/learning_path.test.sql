begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- ----- fixtures: one stage, two published units; unit 1 = practice lesson + task lesson -----
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'e@test.dev'),
  ('00000000-0000-0000-0000-0000000000f2', 'f@test.dev');

insert into public.stages (slug, sort, cefr, title_en, title_vi, tagline_vi, description_vi)
values ('t-stage', 99, 'A2', 'T', 'T', 't', 't');
insert into public.units (stage_id, slug, sort, code, kind, cefr, character, title_en, title_vi, summary_vi, status)
select id, 't-unit-' || n, n, 'S9' || n, 'situation', 'A2', 'linh', 'U', 'U', 's', 'published'
from public.stages, generate_series(1, 2) n where slug = 't-stage';
insert into public.lessons (unit_id, slug, sort, kind, title_en, title_vi, est_minutes, xp, question_count, private)
select u.id, 't-practice', 1, 'practice', 'P', 'P', 5, 20, 1, '{"secret":"x"}' from public.units u where u.slug = 't-unit-1';
insert into public.lessons (unit_id, slug, sort, kind, title_en, title_vi, est_minutes, xp, question_count)
select u.id, 't-task', 2, 'task', 'T', 'T', 5, 30, 0 from public.units u where u.slug = 't-unit-1';

-- Evidence: a finished 1/1 lesson quiz, an unfinished one, and runs pointing at them.
insert into public.quiz_sessions (id, user_id, kind, question_ids, planned_count, answered_count, correct_count, finished_at)
values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000e1', 'lesson', '{}', 1, 1, 1, now()),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000e1', 'lesson', '{}', 1, 0, 0, null),
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-0000000000e1', 'lesson', '{}', 1, 1, 1, now()),
  ('00000000-0000-0000-0000-00000000aa04', '00000000-0000-0000-0000-0000000000e1', 'lesson', '{}', 1, 1, 1, now());
insert into public.lesson_runs (id, user_id, lesson_id, quiz_session_id)
select r.id::uuid, '00000000-0000-0000-0000-0000000000e1', l.id, r.sid::uuid
from (values
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-00000000aa01'),
  ('00000000-0000-0000-0000-00000000bb02', '00000000-0000-0000-0000-00000000aa02'),
  ('00000000-0000-0000-0000-00000000bb04', '00000000-0000-0000-0000-00000000aa03'),
  ('00000000-0000-0000-0000-00000000bb05', '00000000-0000-0000-0000-00000000aa04')) r(id, sid),
  public.lessons l where l.slug = 't-practice';
insert into public.lesson_runs (id, user_id, lesson_id)
select '00000000-0000-0000-0000-00000000bb03', '00000000-0000-0000-0000-0000000000e1', id
from public.lessons where slug = 't-task';

-- ----- as a learner -----
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

select is((select count(*)::int from public.lessons where slug like 't-%'), 2, 'lessons are readable');
select throws_ok($$ select private from public.lessons $$, '42501', null, 'lesson model answers are hidden');
select throws_ok($$ select * from public.lesson_questions $$, '42501', null, 'lesson question lists are hidden');
select throws_ok($$ select * from public.lesson_runs $$, '42501', null, 'lesson runs are server-only');
select throws_ok(
  $$ insert into public.user_lesson_progress (user_id, lesson_id, stars) select auth.uid(), id, 3 from public.lessons limit 1 $$,
  '42501', null, 'no self-awarded stars');
select throws_ok($$ insert into public.certificates (user_id, stage_id, score_pct) select auth.uid(), id, 100 from public.stages limit 1 $$,
  '42501', null, 'no self-issued certificates');
select throws_ok($$ select public.svc_complete_lesson(auth.uid(), '00000000-0000-0000-0000-00000000bb01') $$,
  '42501', null, 'svc_complete_lesson is service-only');

-- ----- as the service role -----
reset role;
set local role service_role;

select throws_ok($$ select public.svc_complete_lesson('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000bb01') $$,
  'P0002', null, 'another learner cannot complete my run');
select throws_ok($$ select public.svc_complete_lesson('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb02') $$,
  'P0001', null, 'an unfinished quiz cannot complete a lesson');

select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb01') ->> 'xp')::int,
  20, 'first completion pays the lesson XP');
select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb01') ->> 'duplicate')::boolean,
  true, 'completing the same run twice is a no-op');
select is((select stars from public.user_lesson_progress p join public.lessons l on l.id = p.lesson_id
  where l.slug = 't-practice' and p.user_id = '00000000-0000-0000-0000-0000000000e1'), 3::smallint, '100% earns 3 stars');

select throws_ok($$ select public.svc_complete_lesson('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb03') $$,
  'P0001', null, 'an ungraded task cannot complete a lesson');
update public.lesson_runs set task_score = 2 where id = '00000000-0000-0000-0000-00000000bb03';
select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb03') ->> 'unit_completed')::boolean,
  true, 'finishing the last lesson completes the unit');
select ok(exists (select 1 from public.user_unit_progress p join public.units u on u.id = p.unit_id
  where u.slug = 't-unit-1' and p.user_id = '00000000-0000-0000-0000-0000000000e1' and p.via = 'lessons'), 'unit progress recorded');
select is((select u.slug from public.profiles p join public.units u on u.id = p.current_unit_id
  where p.id = '00000000-0000-0000-0000-0000000000e1'), 't-unit-2', 'the learner moves to the next unit');
select is((select xp_total from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'), 50, 'XP = 20 + 30');

select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb04') ->> 'xp')::int,
  6, 'a replay pays 30%');
select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000bb05') ->> 'xp')::int,
  0, 'replay XP is paid once per day');

reset role;
set local role anon;
select lives_ok($$ select * from public.get_certificate(gen_random_uuid()) $$, 'certificate pages are public');

select * from finish();
rollback;
