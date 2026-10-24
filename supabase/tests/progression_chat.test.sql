begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d4', 'd@test.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';

select throws_ok($$ insert into public.user_quests (user_id, quest_key, period_key, kind, goal) values (auth.uid(), 'x', 'y', 'daily', 1) $$, '42501', null, 'no forging quests');
select throws_ok($$ update public.user_quests set claimed_at = now() $$, '42501', null, 'no self-claiming');
select throws_ok($$ insert into public.user_cosmetics (user_id, item_id) values (auth.uid(), 'desk-cat') $$, '42501', null, 'no free cosmetics');
select throws_ok($$ insert into public.user_achievements (user_id, achievement_id) values (auth.uid(), 'polyglot') $$, '42501', null, 'no free achievements');
select throws_ok($$ insert into public.review_logs (user_id, sense_id, client_review_id, rating, state_before, elapsed_days, scheduled_days) values (auth.uid(), 1, gen_random_uuid(), 4, 'new', 0, 0) $$, '42501', null, 'no forged reviews');
select throws_ok($$ insert into public.chat_messages (session_id, user_id, role, content) values (gen_random_uuid(), auth.uid(), 'assistant', 'hi') $$, '42501', null, 'no forged chat messages');
select throws_ok($$ select public.svc_spend_coins(auth.uid(), 1, 'x', 'y') $$, '42501', null, 'svc_spend_coins is service-only');
select throws_ok($$ select public.svc_promote(auth.uid(), 'junior') $$, '42501', null, 'svc_promote is service-only');
select throws_ok($$ select public.svc_merge_guest(auth.uid(), auth.uid()) $$, '42501', null, 'svc_merge_guest is service-only');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'rate limits are hidden');
select throws_ok($$ update public.profiles set rank = 'techlead' where id = auth.uid() $$, '42501', null, 'no self-promotion');
select lives_ok($$ select * from public.get_leaderboard('week', 10) $$, 'leaderboard is callable');

select * from finish();
rollback;
