-- Learner reports: 3+ reports pull a question out of rotation for review.
create function private.bump_report(p_question uuid) returns void
language sql security definer set search_path = '' as $$
  update public.questions set
    report_count = (select count(*) from public.question_reports r where r.question_id = p_question and r.resolved_at is null),
    status = case
      when (select count(*) from public.question_reports r where r.question_id = p_question and r.resolved_at is null) >= 3
        and status = 'published' then 'in_review'::public.content_status
      else status end
  where id = p_question;
$$;

create function public.svc_bump_report(p_question uuid) returns void
language sql security definer set search_path = '' as $$
  select private.bump_report(p_question);
$$;

revoke all on function private.bump_report(uuid) from public, anon, authenticated;
grant execute on function private.bump_report(uuid) to service_role;
revoke all on function public.svc_bump_report(uuid) from public, anon, authenticated;
grant execute on function public.svc_bump_report(uuid) to service_role;
