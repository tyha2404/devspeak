-- Untimed practice over a passed lesson: a session kind that earns nothing. `practice` already
-- pays per-answer XP in record_attempt, and complete_lesson only grades lesson runs, so a
-- separate kind keeps stars, XP and lesson progress untouched.
alter table public.quiz_sessions drop constraint if exists quiz_sessions_kind_check;
alter table public.quiz_sessions add constraint quiz_sessions_kind_check
  check (kind in ('npc', 'practice', 'review_verify', 'placement', 'lesson', 'checkpoint', 'test_out',
    'lesson_practice'));
