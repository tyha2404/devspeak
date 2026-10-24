-- Optional: drive the cron routes from Supabase (pg_cron + pg_net) instead of Vercel Cron,
-- e.g. on Vercel Hobby where crons run at most daily. Run once per environment in the SQL editor
-- after storing secrets in Vault:
--   select vault.create_secret('https://your-app.vercel.app', 'app_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function private.call_cron(path text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret');
begin
  perform net.http_get(url := base || path, headers := jsonb_build_object('Authorization', 'Bearer ' || secret));
end;
$$;

select cron.schedule('dq-content-plan', '0 17 * * *', $$ select private.call_cron('/api/cron/content-plan') $$);
select cron.schedule('dq-batch-poll', '*/15 * * * *', $$ select private.call_cron('/api/cron/batch-poll') $$);
select cron.schedule('dq-daily', '30 16 * * *', $$ select private.call_cron('/api/cron/daily') $$);
