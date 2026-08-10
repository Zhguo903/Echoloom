-- EchoLoom optional live-AI persistence foundation.
-- Apply with the Supabase CLI or SQL editor. The browser never receives the service role key.

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 40),
  avatar text,
  level integer not null default 1 check (level between 1 and 999),
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.worlds (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  premise text not null default '',
  setting jsonb not null default '{}'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  story_arcs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  owner_user_id uuid references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  gender text,
  age text,
  personality text not null,
  background text not null default '',
  speaking_style text not null,
  appearance text not null default '',
  default_world uuid references public.worlds(id) on delete set null,
  system_prompt text not null,
  relationship_style text not null default 'slow-burn',
  boundaries jsonb not null default '[]'::jsonb,
  core_conflict text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_character_relationships (
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  intimacy numeric(6,2) not null default 0 check (intimacy between 0 and 100),
  trust numeric(6,2) not null default 10 check (trust between 0 and 100),
  romance numeric(6,2) not null default 0 check (romance between 0 and 100),
  tension numeric(6,2) not null default 10 check (tension between 0 and 100),
  relationship_stage text not null default 'acquaintance',
  qualitative_state jsonb not null default '{}'::jsonb,
  last_interaction timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  role text not null check (role in ('user', 'character', 'system')),
  content text not null check (char_length(content) between 1 and 4000),
  channel text not null default 'text',
  branch_id text not null default 'root',
  provider text not null default 'offline',
  game_event jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  memory_type text not null check (memory_type in ('profile', 'preference', 'relationship', 'emotional')),
  importance smallint not null default 5 check (importance between 1 and 10),
  emotion text not null default 'neutral',
  source_message_id uuid references public.chat_messages(id) on delete set null,
  branch_id text not null default 'root',
  world_id uuid references public.worlds(id) on delete set null,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_states (
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  world_id uuid references public.worlds(id) on delete set null,
  current_chapter text not null default 'chapter_1',
  current_scene text not null default 'first_contact',
  completed_events jsonb not null default '[]'::jsonb,
  locked_events jsonb not null default '[]'::jsonb,
  flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

create table if not exists public.story_choices (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  world_id uuid references public.worlds(id) on delete set null,
  chapter text not null,
  event text not null,
  choice_intent text not null,
  player_text text,
  result jsonb not null default '{}'::jsonb,
  branch_id text not null default 'root',
  created_at timestamptz not null default now()
);

create table if not exists public.save_slots (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  slot_number smallint not null check (slot_number between 1 and 20),
  label text not null default '',
  state jsonb not null,
  schema_version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot_number)
);

create table if not exists public.scene_backgrounds (
  id uuid primary key default extensions.gen_random_uuid(),
  scene_fingerprint text not null unique,
  prompt text not null,
  scene jsonb not null,
  storage_path text not null,
  provider text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx on public.chat_messages (user_id, character_id, created_at desc);
create index if not exists memories_recent_idx on public.memories (user_id, character_id, importance desc, created_at desc);
create index if not exists story_choices_thread_idx on public.story_choices (user_id, character_id, created_at desc);

alter table public.users enable row level security;
alter table public.worlds enable row level security;
alter table public.characters enable row level security;
alter table public.user_character_relationships enable row level security;
alter table public.chat_messages enable row level security;
alter table public.memories enable row level security;
alter table public.story_states enable row level security;
alter table public.story_choices enable row level security;
alter table public.save_slots enable row level security;
alter table public.scene_backgrounds enable row level security;

create policy "users manage self" on public.users for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own worlds" on public.worlds for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own custom characters" on public.characters for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "users manage own relationships" on public.user_character_relationships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own messages" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own memories" on public.memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own story states" on public.story_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own story choices" on public.story_choices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own save slots" on public.save_slots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared system personas and cached backgrounds stay server-only because the rows include prompts.
revoke all on public.characters from anon, authenticated;
revoke all on public.scene_backgrounds from anon, authenticated;

create or replace function public.apply_validated_game_event(
  p_user_id uuid,
  p_character_id text,
  p_user_message text,
  p_dialogue text,
  p_relationship jsonb,
  p_story jsonb,
  p_memory jsonb,
  p_event jsonb,
  p_branch_id text default 'root',
  p_provider text default 'gemini'
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_message_id uuid;
  v_character_message_id uuid;
  v_trust_delta numeric := greatest(-2.5, least(2.5, coalesce((p_relationship->>'trust_delta')::numeric, 0)));
  v_intimacy_delta numeric := greatest(-2.5, least(2.5, coalesce((p_relationship->>'intimacy_delta')::numeric, 0)));
  v_romance_delta numeric := greatest(-1.5, least(1.5, coalesce((p_relationship->>'romance_delta')::numeric, 0)));
  v_tension_delta numeric := greatest(-2.5, least(2.5, coalesce((p_relationship->>'tension_delta')::numeric, 0)));
  v_flags jsonb := case when jsonb_typeof(p_story->'flags') = 'object' then p_story->'flags' else '{}'::jsonb end;
begin
  if char_length(trim(p_user_message)) not between 1 and 1000 then raise exception 'invalid user message'; end if;
  if char_length(trim(p_dialogue)) not between 1 and 1200 then raise exception 'invalid character dialogue'; end if;
  if not exists (select 1 from public.users where id = p_user_id) then raise exception 'unknown user'; end if;
  if not exists (select 1 from public.characters where id = p_character_id) then raise exception 'unknown character'; end if;

  insert into public.chat_messages (user_id, character_id, role, content, branch_id, provider)
  values (p_user_id, p_character_id, 'user', trim(p_user_message), coalesce(nullif(p_branch_id, ''), 'root'), p_provider)
  returning id into v_user_message_id;

  insert into public.chat_messages (user_id, character_id, role, content, branch_id, provider, game_event)
  values (p_user_id, p_character_id, 'character', trim(p_dialogue), coalesce(nullif(p_branch_id, ''), 'root'), p_provider, p_event)
  returning id into v_character_message_id;

  insert into public.user_character_relationships (user_id, character_id, trust, intimacy, romance, tension, last_interaction)
  values (
    p_user_id,
    p_character_id,
    greatest(0, least(100, 10 + v_trust_delta)),
    greatest(0, least(100, v_intimacy_delta)),
    greatest(0, least(100, v_romance_delta)),
    greatest(0, least(100, 10 + v_tension_delta)),
    now()
  )
  on conflict (user_id, character_id) do update set
    trust = greatest(0, least(100, user_character_relationships.trust + v_trust_delta)),
    intimacy = greatest(0, least(100, user_character_relationships.intimacy + v_intimacy_delta)),
    romance = greatest(0, least(100, user_character_relationships.romance + v_romance_delta)),
    tension = greatest(0, least(100, user_character_relationships.tension + v_tension_delta)),
    last_interaction = now(),
    updated_at = now();

  insert into public.story_states (user_id, character_id, current_chapter, current_scene, flags)
  values (
    p_user_id,
    p_character_id,
    coalesce(nullif(p_story->>'chapter', ''), 'chapter_1'),
    coalesce(nullif(p_story->>'scene', ''), 'first_contact'),
    v_flags
  )
  on conflict (user_id, character_id) do update set
    current_chapter = coalesce(nullif(p_story->>'chapter', ''), story_states.current_chapter),
    current_scene = coalesce(nullif(p_story->>'scene', ''), story_states.current_scene),
    flags = story_states.flags || v_flags,
    updated_at = now();

  if coalesce((p_memory->>'save')::boolean, false)
    and char_length(trim(coalesce(p_memory->>'content', ''))) between 1 and 1000
    and coalesce(p_memory->>'memory_type', '') in ('profile', 'preference', 'relationship', 'emotional') then
    insert into public.memories (
      user_id, character_id, content, memory_type, importance, emotion, source_message_id, branch_id
    ) values (
      p_user_id,
      p_character_id,
      trim(p_memory->>'content'),
      p_memory->>'memory_type',
      greatest(1, least(10, coalesce((p_memory->>'importance')::smallint, 5))),
      left(coalesce(nullif(p_memory->>'emotion', ''), 'neutral'), 40),
      v_user_message_id,
      coalesce(nullif(p_branch_id, ''), 'root')
    );
  end if;

  return jsonb_build_object(
    'user_message_id', v_user_message_id,
    'character_message_id', v_character_message_id,
    'relationship', (select to_jsonb(r) from public.user_character_relationships r where r.user_id = p_user_id and r.character_id = p_character_id),
    'story_state', (select to_jsonb(s) from public.story_states s where s.user_id = p_user_id and s.character_id = p_character_id)
  );
end;
$$;

revoke all on function public.apply_validated_game_event(uuid, text, text, text, jsonb, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.apply_validated_game_event(uuid, text, text, text, jsonb, jsonb, jsonb, jsonb, text, text) to service_role;

