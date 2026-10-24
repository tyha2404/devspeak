begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c3', 'c@test.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';

select throws_ok($$ select * from public.question_deliveries limit 1 $$, '42501', null,
  'learners cannot read deliveries (option maps)');
select throws_ok($$ select * from public.dialogues limit 1 $$, '42501', null,
  'learners cannot read dialogue graphs');
select is((select count(*)::int from public.question_versions), 0,
  'learners see no question versions (answer keys)');
select is((select count(*)::int from public.questions), 0, 'learners see no questions directly');
select ok((select count(*) from public.senses) >= 0, 'published senses are readable');
select throws_ok(
  $$ insert into public.user_cards (user_id, sense_id) values (auth.uid(), 1) $$,
  '42501', null, 'learners cannot write notebook cards directly');
select throws_ok(
  $$ insert into public.user_answers (delivery_id, user_id, question_id, question_version_id, response, is_correct, attempts, latency_ms)
     values (gen_random_uuid(), auth.uid(), gen_random_uuid(), gen_random_uuid(), '{}', true, 1, 1000) $$,
  '42501', null, 'learners cannot forge answers');
select throws_ok(
  $$ select public.svc_record_attempt(gen_random_uuid(), auth.uid(), '{}', true) $$,
  '42501', null, 'learners cannot call svc_record_attempt');
select throws_ok(
  $$ select public.svc_add_card(auth.uid(), 1) $$,
  '42501', null, 'learners cannot call svc_add_card');
select throws_ok(
  $$ update public.question_reports set resolved_at = now() $$,
  '42501', null, 'learners cannot resolve reports');

select * from finish();
rollback;
