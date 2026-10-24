begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- ----- fixtures: grammar stage (sort 989) before a career stage (990), vocab stage after (991) -----
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'g@test.dev'),
  ('00000000-0000-0000-0000-0000000000a8', 'h@test.dev');

insert into public.stages (slug, sort, track, cefr, title_en, title_vi, tagline_vi, description_vi) values
  ('tt-grammar', 989, 'grammar', 'A1', 'G', 'G', 't', 't'),
  ('tt-career', 990, 'career', 'A2', 'C', 'C', 't', 't'),
  ('tt-vocab', 991, 'vocab', 'A2', 'V', 'V', 't', 't');
insert into public.units (stage_id, slug, sort, code, kind, cefr, character, title_en, title_vi, summary_vi, status)
select s.id, x.slug, x.sort, x.code, x.kind::public.unit_kind, 'A2', 'linh', 'U', 'U', 's', 'published'
from (values
  ('tt-grammar', 'tt-g1', 1, 'A1', 'grammar'),
  ('tt-grammar', 'tt-g2', 2, 'A2', 'grammar'),
  ('tt-career', 'tt-c1', 1, 'S91', 'situation'),
  ('tt-vocab', 'tt-v1', 1, 'T91', 'topic')) x(stage, slug, sort, code, kind)
join public.stages s on s.slug = x.stage;
insert into public.lessons (unit_id, slug, sort, kind, title_en, title_vi, est_minutes, xp, question_count)
select id, 'tt-g1-lesson', 1, 'grammar', 'L', 'L', 10, 25, 1 from public.units where slug = 'tt-g1';

insert into public.quiz_sessions (id, user_id, kind, question_ids, planned_count, answered_count, correct_count, finished_at)
values ('00000000-0000-0000-0000-00000000ac01', '00000000-0000-0000-0000-0000000000a7', 'lesson', '{}', 1, 1, 1, now());
insert into public.lesson_runs (id, user_id, lesson_id, quiz_session_id)
select '00000000-0000-0000-0000-00000000ad01', '00000000-0000-0000-0000-0000000000a7', id,
  '00000000-0000-0000-0000-00000000ac01'
from public.lessons where slug = 'tt-g1-lesson';

-- A second, later run of the same grammar lesson (replays pay in full on the study tracks).
insert into public.quiz_sessions (id, user_id, kind, question_ids, planned_count, answered_count, correct_count, finished_at)
values ('00000000-0000-0000-0000-00000000ac03', '00000000-0000-0000-0000-0000000000a7', 'lesson', '{}', 10, 9, 9, now());
insert into public.lesson_runs (id, user_id, lesson_id, quiz_session_id)
select '00000000-0000-0000-0000-00000000ad02', '00000000-0000-0000-0000-0000000000a7', id,
  '00000000-0000-0000-0000-00000000ac03'
from public.lessons where slug = 'tt-g1-lesson';

insert into public.quiz_sessions (id, user_id, kind, ref, question_ids, planned_count, answered_count, correct_count, finished_at)
select '00000000-0000-0000-0000-00000000ac02', '00000000-0000-0000-0000-0000000000a7', 'test_out', 'unit:' || id, '{}', 1, 1, 1, now()
from public.units where slug = 'tt-g2';

-- ----- as a learner -----
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}';
select throws_ok($$ select private.unit_track(1) $$, '42501', null, 'unit_track is server-only');
select throws_ok($$ update public.quiz_sessions set max_attempts = 3, time_limited = false $$,
  '42501', null, 'learners cannot loosen their own exam rules');

-- ----- as the service role -----
reset role;
set local role service_role;

select is(private.next_unit((select id from public.units where slug = 'tt-c1')), null,
  'the career path never continues into a study track');
select is(private.next_unit((select id from public.units where slug = 'tt-g1')),
  (select id from public.units where slug = 'tt-g2'), 'grammar levels follow each other');

create temp table r as select public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ad01') as v;
select is((select (v ->> 'unit_completed')::boolean from r), true,
  'finishing a grammar level''s only lesson completes the level');
select is((select (v ->> 'stars')::int from r), 3, 'a perfect track test is 3 stars');
select is((select (v ->> 'xp')::int from r), 80, 'track lessons pay 35 + 15 per star');
select ok(exists (select 1 from public.user_unit_progress p join public.units u on u.id = p.unit_id
  where p.user_id = '00000000-0000-0000-0000-0000000000a7' and u.slug = 'tt-g1'), 'grammar level progress recorded');
select is((select current_unit_id from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'), null,
  'study tracks do not move the career "current unit"');

select is((public.svc_complete_lesson('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ad02') ->> 'xp')::int, 65, 'a replayed track lesson pays again (90% = 2 stars)');
select is((select streak_current from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'), 1,
  'finishing a track test starts the streak');
select is((select streak_last_date from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'),
  private.local_date('Asia/Ho_Chi_Minh'), 'and marks today');

select is((public.svc_test_out_unit('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ac02') ->> 'xp')::int, 120, 'a level test-out pays 120 XP');
select is((public.svc_test_out_unit('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ac02') ->> 'xp')::int, 0, 'once per test session');

select public.svc_place_user('00000000-0000-0000-0000-0000000000a8',
  (select id from public.units where slug = 'tt-c1'), 'A2');
select is((select count(*)::int from public.user_unit_progress p join public.units u on u.id = p.unit_id
  where p.user_id = '00000000-0000-0000-0000-0000000000a8' and u.slug like 'tt-g%'), 0,
  'placement does not skip grammar levels');
select is((select current_unit_id from public.profiles where id = '00000000-0000-0000-0000-0000000000a8'),
  (select id from public.units where slug = 'tt-c1'), 'placement still sets the career unit');

select * from finish();
rollback;
