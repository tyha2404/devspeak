begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d4', 'd@test.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';

select throws_ok($$ insert into public.review_logs (user_id, sense_id, client_review_id, rating, state_before, elapsed_days, scheduled_days) values (auth.uid(), 1, gen_random_uuid(), 4, 'new', 0, 0) $$, '42501', null, 'no forged reviews');
select throws_ok($$ insert into public.chat_messages (session_id, user_id, role, content) values (gen_random_uuid(), auth.uid(), 'assistant', 'hi') $$, '42501', null, 'no forged chat messages');
select throws_ok($$ select public.svc_merge_guest(auth.uid(), auth.uid()) $$, '42501', null, 'svc_merge_guest is service-only');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'rate limits are hidden');
select throws_ok($$ update public.profiles set streak_current = 999 where id = auth.uid() $$, '42501', null, 'no self-granted streaks');
select lives_ok($$ update public.profiles set daily_goal_xp = 30 where id = auth.uid() $$, 'learners choose their daily goal');

select * from finish();
rollback;
