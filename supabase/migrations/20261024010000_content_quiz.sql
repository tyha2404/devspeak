-- M2: vocabulary content, question bank, deliveries (anti-cheat), dialogues, notebook cards.

create type public.content_status as enum ('draft', 'auto_checked', 'in_review', 'published', 'rejected', 'retired');
create type public.content_origin as enum ('dataset', 'ai', 'human');
create type public.question_type as enum (
  'mcq_meaning', 'fill_blank', 'sentence_order', 'error_correction', 'reply_choice', 'listening'
);
create type public.srs_state as enum ('new', 'learning', 'review', 'relearning');

-- ===== vocabulary =====
create table public.lexemes (
  id bigserial primary key,
  display text not null,
  normalized text not null,
  pos text not null,
  kind text not null default 'word' check (kind in ('word', 'phrasal', 'collocation', 'phrase')),
  cefr public.cefr_level,
  cefr_source text,
  cefr_confidence text check (cefr_confidence in ('high', 'med', 'low')),
  ngsl_rank int,
  zipf real,
  is_it_term boolean not null default false,
  it_level text check (it_level in ('junior', 'mid', 'senior')),
  ipa text,
  source_id smallint not null references public.sources,
  created_at timestamptz not null default now(),
  unique (normalized, pos)
);
create index lexemes_cefr_idx on public.lexemes (cefr);

create table public.word_forms (
  form text not null,
  lexeme_id bigint not null references public.lexemes on delete cascade,
  kind text not null default 'inflection',
  primary key (form, lexeme_id)
);

create table public.senses (
  id bigserial primary key,
  lexeme_id bigint not null references public.lexemes on delete cascade,
  slug text unique not null,                       -- stable id used by curated content, e.g. 'blocker-n'
  definition_en text not null check (char_length(definition_en) <= 300),
  meaning_vi text not null,
  meaning_vi_source text,
  vi_usage_note text,
  keep_english_in_vi boolean not null default false,
  topic text,
  review_status public.content_status not null default 'draft',
  locked_by_review boolean not null default false,
  source_id smallint not null references public.sources,
  content_hash text,
  created_at timestamptz not null default now()
);
create index senses_lexeme_idx on public.senses (lexeme_id);

create table public.examples (
  id bigserial primary key,
  sense_id bigint not null references public.senses on delete cascade,
  text_en text not null check (char_length(text_en) <= 300),
  text_vi text,
  source_id smallint not null references public.sources,
  source_ref text,
  audio_url text,
  audio_license text,
  audio_author text,
  unique (sense_id, text_en)
);

-- ===== question bank (versioned; answers are server-only) =====
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  type public.question_type not null,
  cefr public.cefr_level not null,
  topic text,
  npc_id text,
  sense_ids bigint[] not null default '{}',
  status public.content_status not null default 'draft',
  origin public.content_origin not null,
  source_id smallint not null references public.sources,
  current_version_id uuid,
  served_count int not null default 0,
  correct_count int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now()
);
create index questions_published_idx on public.questions (npc_id, cefr) where status = 'published';
create index questions_sense_idx on public.questions using gin (sense_ids);

create table public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions on delete cascade,
  version int not null,
  prompt jsonb not null,            -- shown to the learner (never contains the key)
  answer jsonb not null,            -- server-only answer key
  hint_vi text,
  explanation_vi text,
  explanation_en text,
  content_hash text not null,
  generator jsonb,
  qa_report jsonb,
  created_at timestamptz not null default now(),
  unique (question_id, version),
  unique (content_hash)
);
alter table public.questions add constraint questions_current_version_fk
  foreign key (current_version_id) references public.question_versions deferrable initially deferred;

create table public.question_reports (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  question_id uuid not null references public.questions on delete cascade,
  reason text not null check (reason in ('wrong_answer', 'ambiguous', 'typo', 'offensive', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, question_id)
);

-- ===== quiz runtime =====
create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('npc', 'daily', 'practice', 'review_verify', 'placement', 'boss')),
  npc_id text,
  question_ids uuid[] not null,
  planned_count smallint not null,
  answered_count smallint not null default 0,
  correct_count smallint not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index quiz_sessions_user_idx on public.quiz_sessions (user_id, started_at desc);

create table public.question_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid references public.quiz_sessions on delete cascade,
  question_id uuid not null references public.questions,
  question_version_id uuid not null references public.question_versions,
  option_map jsonb,                 -- opaque per-delivery option ids -> real ids
  served_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  hint_used boolean not null default false,
  answered_at timestamptz,
  correct boolean
);
create index question_deliveries_user_idx on public.question_deliveries (user_id, served_at desc);

create table public.user_answers (
  id bigserial primary key,
  delivery_id uuid not null unique references public.question_deliveries on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  question_id uuid not null references public.questions,
  question_version_id uuid not null references public.question_versions,
  response jsonb not null,
  is_correct boolean not null,
  attempts smallint not null,
  latency_ms int not null,
  xp_awarded int not null default 0,
  created_at timestamptz not null default now()
);
create index user_answers_user_q_idx on public.user_answers (user_id, question_id, created_at desc);

-- ===== dialogues (graphs are server-only) =====
create table public.dialogues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  npc_id text not null,
  title_en text not null,
  title_vi text not null,
  cefr public.cefr_level not null,
  version int not null default 1,
  graph jsonb not null,
  unlock_level int not null default 1,
  sort_order int not null default 0,
  xp_reward int not null default 20,
  status public.content_status not null default 'draft',
  origin public.content_origin not null,
  source_id smallint not null references public.sources
);
create index dialogues_npc_idx on public.dialogues (npc_id, sort_order) where status = 'published';

create table public.dialogue_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  dialogue_id uuid not null references public.dialogues on delete cascade,
  dialogue_version int not null,
  current_node text not null,
  path jsonb not null default '[]',
  score smallint not null default 0,
  quiz_session_id uuid references public.quiz_sessions on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index dialogue_runs_user_idx on public.dialogue_runs (user_id, dialogue_id);

-- ===== notebook / SRS cards (FSRS fields; scheduling lands in M4) =====
create table public.user_cards (
  user_id uuid references auth.users on delete cascade,
  sense_id bigint references public.senses on delete cascade,
  state public.srs_state not null default 'new',
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  learning_steps int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  last_review timestamptz,
  added_via text not null default 'notebook',
  added_at timestamptz not null default now(),
  primary key (user_id, sense_id)
);
create index user_cards_due_idx on public.user_cards (user_id, due);

-- ===== RLS =====
alter table public.lexemes enable row level security;
alter table public.word_forms enable row level security;
alter table public.senses enable row level security;
alter table public.examples enable row level security;
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_reports enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.question_deliveries enable row level security;
alter table public.user_answers enable row level security;
alter table public.dialogues enable row level security;
alter table public.dialogue_runs enable row level security;
alter table public.user_cards enable row level security;

-- Published vocabulary is public reference data.
create policy "lexemes readable" on public.lexemes for select using (true);
create policy "word_forms readable" on public.word_forms for select using (true);
create policy "senses published readable" on public.senses for select
  using (review_status = 'published' or (select public.has_role('editor')));
create policy "examples readable" on public.examples for select using (true);

-- Question bank, deliveries and dialogue graphs: never readable by learners directly.
revoke all on public.questions, public.question_versions, public.question_deliveries, public.dialogues
  from anon, authenticated;
create policy "questions editor read" on public.questions for select to authenticated
  using ((select public.has_role('editor')));
create policy "question_versions editor read" on public.question_versions for select to authenticated
  using ((select public.has_role('editor')));
grant select on public.questions, public.question_versions to authenticated; -- gated by the editor policy

-- Learner-owned rows: read own, writes only via service role.
create policy "quiz_sessions select own" on public.quiz_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "user_answers select own" on public.user_answers for select to authenticated
  using (user_id = (select auth.uid()));
create policy "dialogue_runs select own" on public.dialogue_runs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "user_cards select own" on public.user_cards for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.quiz_sessions, public.user_answers, public.dialogue_runs,
  public.user_cards from anon, authenticated;

create policy "question_reports insert own" on public.question_reports for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "question_reports select own" on public.question_reports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('editor')));
revoke update, delete on public.question_reports from anon, authenticated;

revoke all on public.lexemes, public.word_forms, public.senses, public.examples from anon, authenticated;
grant select on public.lexemes, public.word_forms, public.senses, public.examples to anon, authenticated;

-- ===== privileged functions =====

-- Record one attempt at a delivered question. The route grades; this function enforces
-- ownership, expiry, the attempt limit and all XP rules atomically.
--   XP: 10 on a first-try correct answer without hint, otherwise 5 when correct; 0 if the same
--   question was answered correctly in the last 14 days, if the answer came < 800 ms after the
--   question was served, or once the daily quiz cap (400) is reached. Practice sessions pay half.
create function private.record_attempt(
  p_delivery uuid,
  p_user uuid,
  p_response jsonb,
  p_is_correct boolean,
  p_max_attempts int default 2
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d public.question_deliveries;
  s public.quiz_sessions;
  v_attempt int;
  v_final boolean;
  v_xp int := 0;
  v_latency int;
  v_repeat boolean;
  v_today_quiz int;
  v_tz text;
  v_award jsonb := null;
  v_bonus jsonb := null;
  v_session_done boolean := false;
begin
  select * into d from public.question_deliveries where id = p_delivery for update;
  if not found or d.user_id <> p_user then
    raise exception 'delivery not found' using errcode = 'P0002';
  end if;
  if d.answered_at is not null then
    raise exception 'already answered' using errcode = 'P0001', hint = 'ALREADY_ANSWERED';
  end if;
  if d.expires_at < now() then
    raise exception 'delivery expired' using errcode = 'P0001', hint = 'DELIVERY_EXPIRED';
  end if;

  v_attempt := d.attempts + 1;
  v_final := p_is_correct or v_attempt >= p_max_attempts;
  update public.question_deliveries set attempts = v_attempt where id = d.id;

  if not v_final then
    return jsonb_build_object('final', false, 'attempt', v_attempt, 'correct', false, 'xp', 0);
  end if;

  v_latency := greatest(0, (extract(epoch from (now() - d.served_at)) * 1000)::int);

  if p_is_correct then
    select exists (
      select 1 from public.user_answers ua
      where ua.user_id = p_user and ua.question_id = d.question_id and ua.is_correct
        and ua.created_at > now() - interval '14 days'
    ) into v_repeat;
    select timezone into v_tz from public.profiles where id = p_user;
    select coalesce(xp_quiz, 0) into v_today_quiz from public.daily_activity
      where user_id = p_user and local_date = private.local_date(v_tz);
    v_xp := case when v_attempt = 1 and not d.hint_used then 10 else 5 end;
    if v_repeat or v_latency < 800 then v_xp := 0; end if;
    if d.session_id is not null then
      select * into s from public.quiz_sessions where id = d.session_id;
      if s.kind = 'practice' then v_xp := v_xp / 2; end if;
    end if;
    v_xp := least(v_xp, greatest(0, 400 - coalesce(v_today_quiz, 0)));
  end if;

  update public.question_deliveries set answered_at = now(), correct = p_is_correct where id = d.id;
  insert into public.user_answers (delivery_id, user_id, question_id, question_version_id, response,
    is_correct, attempts, latency_ms, xp_awarded)
  values (d.id, p_user, d.question_id, d.question_version_id, p_response, p_is_correct, v_attempt, v_latency, v_xp);
  update public.questions set served_count = served_count + 1,
    correct_count = correct_count + case when p_is_correct then 1 else 0 end
  where id = d.question_id;

  if v_xp > 0 then
    v_award := private.award_xp(p_user, v_xp, 'quiz_correct', 'answer:' || d.id::text, 'question',
      d.question_id::text, case when v_xp > 0 then 1 else 0 end);
  end if;

  if d.session_id is not null then
    update public.quiz_sessions set
      answered_count = answered_count + 1,
      correct_count = correct_count + case when p_is_correct then 1 else 0 end,
      finished_at = case when answered_count + 1 >= planned_count then now() else null end
    where id = d.session_id
    returning * into s;
    v_session_done := s.finished_at is not null;
    -- Mini-game completion bonus: 30 + up to 20 for accuracy (full at >= 90%).
    if v_session_done and s.kind in ('npc', 'daily', 'boss') then
      v_bonus := private.award_xp(p_user,
        30 + least(20, (20 * s.correct_count::numeric / greatest(1, s.planned_count) / 0.9)::int),
        'minigame_complete', 'session:' || s.id::text, 'quiz_session', s.id::text, 5);
    end if;
  end if;

  return jsonb_build_object(
    'final', true,
    'attempt', v_attempt,
    'correct', p_is_correct,
    'xp', v_xp,
    'award', coalesce(v_bonus, v_award),
    'session', case when d.session_id is null then null else jsonb_build_object(
      'answered', s.answered_count, 'correct', s.correct_count, 'total', s.planned_count,
      'done', v_session_done) end
  );
end;
$$;

-- Add a sense to the learner's notebook (an SRS card in state "new"). Idempotent.
create function private.add_card(p_user uuid, p_sense bigint, p_via text default 'notebook')
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_cards (user_id, sense_id, added_via) values (p_user, p_sense, p_via)
  on conflict do nothing;
  return found;
end;
$$;

create function public.svc_record_attempt(p_delivery uuid, p_user uuid, p_response jsonb,
  p_is_correct boolean, p_max_attempts int default 2) returns jsonb
language sql security definer set search_path = '' as $$
  select private.record_attempt(p_delivery, p_user, p_response, p_is_correct, p_max_attempts);
$$;

create function public.svc_add_card(p_user uuid, p_sense bigint, p_via text default 'notebook')
returns boolean language sql security definer set search_path = '' as $$
  select private.add_card(p_user, p_sense, p_via);
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
revoke all on function public.svc_record_attempt(uuid, uuid, jsonb, boolean, int) from public, anon, authenticated;
revoke all on function public.svc_add_card(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.svc_record_attempt(uuid, uuid, jsonb, boolean, int) to service_role;
grant execute on function public.svc_add_card(uuid, bigint, text) to service_role;
