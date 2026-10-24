-- Fixed-window rate limits (Postgres is plenty at this scale; Upstash is a drop-in later).
create table public.rate_limits (
  subject text not null,
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (subject, bucket, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create function private.consume_rate_limit(p_subject text, p_bucket text, p_limit int, p_window_s int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_s) * p_window_s);
        v_count int;
begin
  insert into public.rate_limits (subject, bucket, window_start, count) values (p_subject, p_bucket, v_start, 1)
  on conflict (subject, bucket, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;
create function public.svc_rate_limit(p_subject text, p_bucket text, p_limit int, p_window_s int) returns boolean
language sql security definer set search_path = '' as $$ select private.consume_rate_limit(p_subject, p_bucket, p_limit, p_window_s); $$;
revoke all on function private.consume_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function private.consume_rate_limit(text, text, int, int) to service_role;
revoke all on function public.svc_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.svc_rate_limit(text, text, int, int) to service_role;
