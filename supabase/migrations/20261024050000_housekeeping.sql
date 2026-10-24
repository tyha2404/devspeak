-- Daily housekeeping (cron 23:30 ICT).
create function private.housekeeping() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_deliveries int; v_limits int; v_guests int; v_flagged int; v_chat int;
begin
  delete from public.question_deliveries where answered_at is null and expires_at < now() - interval '7 days';
  get diagnostics v_deliveries = row_count;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_limits = row_count;
  -- Guests inactive for 30 days (no XP and no sign-in).
  delete from auth.users u where u.is_anonymous and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
    and not exists (select 1 from public.xp_events e where e.user_id = u.id and e.created_at > now() - interval '30 days');
  get diagnostics v_guests = row_count;
  -- Items that almost everyone fails or passes are probably broken or trivial: back to review.
  update public.questions set status = 'in_review'
  where status = 'published' and served_count >= 30
    and (correct_count::numeric / served_count < 0.15 or correct_count::numeric / served_count > 0.98);
  get diagnostics v_flagged = row_count;
  v_chat := private.purge_chat_logs();
  return jsonb_build_object('expired_deliveries', v_deliveries, 'rate_limit_rows', v_limits, 'guests_removed', v_guests,
    'questions_to_review', v_flagged, 'chat_messages_purged', v_chat);
end;
$$;
create function public.svc_housekeeping() returns jsonb
language sql security definer set search_path = '' as $$ select private.housekeeping(); $$;
revoke all on function private.housekeeping() from public, anon, authenticated;
grant execute on function private.housekeeping() to service_role;
revoke all on function public.svc_housekeeping() from public, anon, authenticated;
grant execute on function public.svc_housekeeping() to service_role;
