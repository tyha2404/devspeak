-- Sign-up passes a display name in the user metadata; store it on the profile right away
-- (with email confirmation on, there is no session to save it from the client yet).
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 32), ''))
  on conflict do nothing;
  return new;
end;
$$;
