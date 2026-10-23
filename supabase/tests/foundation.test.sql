begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Two users; the auth trigger creates their profiles.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev');

select is(
  (select count(*)::int from public.profiles where id in
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')),
  2, 'profiles created by auth trigger');

-- ----- as user A -----
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'user sees only own profile');

select lives_ok(
  $$ update public.profiles set display_name = 'Ty' where id = auth.uid() $$,
  'user can update display_name');

select throws_ok(
  $$ update public.profiles set xp_total = 99999 where id = auth.uid() $$,
  '42501', null, 'user cannot update xp_total');

select throws_ok(
  $$ update public.profiles set level = 40 where id = auth.uid() $$,
  '42501', null, 'user cannot update level');

select throws_ok(
  $$ insert into public.xp_events (user_id, amount, reason, idempotency_key, local_date)
     values (auth.uid(), 100, 'quiz_correct', 'x', current_date) $$,
  '42501', null, 'user cannot insert into the XP ledger');

select throws_ok(
  $$ select public.svc_award_xp(auth.uid(), 100, 'quiz_correct', 'k1') $$,
  '42501', null, 'user cannot execute svc_award_xp');

select throws_ok(
  $$ select private.award_xp(auth.uid(), 100, 'quiz_correct', 'k1') $$,
  '42501', null, 'user cannot use private schema');

select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  0, 'user A cannot read user B profile');

-- ----- as service role -----
reset role;
set local role service_role;

select is(
  (public.svc_award_xp('00000000-0000-0000-0000-0000000000a1', 160, 'quiz_correct', 'answer:1') ->> 'level')::int,
  2, 'award_xp recomputes level (160 XP -> L2)');

select is(
  (public.svc_award_xp('00000000-0000-0000-0000-0000000000a1', 160, 'quiz_correct', 'answer:1') ->> 'duplicate')::boolean,
  true, 'same idempotency key is a no-op');

select is(
  (select xp_total from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  160, 'XP counted once');

select is(
  (select streak_current from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'first day with >= 50 XP starts a streak');

select is(
  (select xp_required from public.level_thresholds where level = 21),
  11500, 'Senior starts at 11,500 XP');

select * from finish();
rollback;
