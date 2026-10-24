create function private.chat_turn(p_user uuid, p_day date) returns void
language sql security definer set search_path = '' as $$
  insert into public.daily_activity (user_id, local_date, chat_turns) values (p_user, p_day, 1)
  on conflict (user_id, local_date) do update set chat_turns = public.daily_activity.chat_turns + 1;
$$;
create function public.svc_chat_turn(p_user uuid, p_day date) returns void
language sql security definer set search_path = '' as $$ select private.chat_turn(p_user, p_day); $$;
revoke all on function private.chat_turn(uuid, date) from public, anon, authenticated;
grant execute on function private.chat_turn(uuid, date) to service_role;
revoke all on function public.svc_chat_turn(uuid, date) from public, anon, authenticated;
grant execute on function public.svc_chat_turn(uuid, date) to service_role;
