create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_label text null,
  platform text not null check (platform in ('macos', 'web', 'other')),
  public_install_id text not null,
  last_seen_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  unique(user_id, public_install_id)
);

create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  auth_session_id text not null,
  token_hash text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_seen_at timestamptz null
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'personas_id_user_id_key'
      and conrelid = 'public.personas'::regclass
  ) then
    alter table public.personas
      add constraint personas_id_user_id_key unique (id, user_id);
  end if;
end;
$$;

create table if not exists public.cloud_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  title text null,
  active_surface text null check (active_surface in ('web', 'app')),
  summary text null,
  last_message_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique(id, user_id)
);

create table if not exists public.cloud_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.cloud_conversations(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system_summary')),
  content text not null,
  provider text null,
  surface text not null check (surface in ('web', 'app')),
  source_device_id uuid null references public.devices(id),
  local_message_id text null,
  idempotency_key text not null,
  safety_grade text not null,
  client_created_at timestamptz not null,
  client_sequence integer null,
  server_received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, conversation_id, idempotency_key),
  foreign key (conversation_id, user_id)
    references public.cloud_conversations(id, user_id),
  foreign key (persona_id, user_id)
    references public.personas(id, user_id)
);

create unique index if not exists cloud_conversation_messages_local_id_idx
  on public.cloud_conversation_messages(user_id, conversation_id, source_device_id, local_message_id)
  where local_message_id is not null;

create index if not exists cloud_conversation_messages_stable_order_idx
  on public.cloud_conversation_messages(
    conversation_id,
    client_created_at asc,
    source_device_id asc,
    client_sequence asc,
    server_received_at asc,
    id asc
  );

create table if not exists public.conversation_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  conversation_id uuid not null references public.cloud_conversations(id) on delete cascade,
  last_seen_message_created_at timestamptz null,
  last_seen_message_id uuid null references public.cloud_conversation_messages(id),
  last_seen_server_received_at timestamptz null,
  last_acknowledged_client_sequence integer null,
  updated_at timestamptz not null default now(),
  unique(user_id, device_id, conversation_id),
  foreign key (conversation_id, user_id)
    references public.cloud_conversations(id, user_id)
);

drop trigger if exists cloud_conversations_set_updated_at on public.cloud_conversations;
create trigger cloud_conversations_set_updated_at
before update on public.cloud_conversations
for each row execute function public.set_updated_at();

alter table public.devices enable row level security;
alter table public.device_sessions enable row level security;
alter table public.cloud_conversations enable row level security;
alter table public.cloud_conversation_messages enable row level security;
alter table public.conversation_sync_cursors enable row level security;

drop policy if exists devices_select_own on public.devices;
create policy devices_select_own on public.devices
for select using (user_id = auth.uid());

drop policy if exists devices_insert_own on public.devices;
create policy devices_insert_own on public.devices
for insert with check (user_id = auth.uid());

drop policy if exists devices_update_own on public.devices;
create policy devices_update_own on public.devices
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists device_sessions_select_own on public.device_sessions;
create policy device_sessions_select_own on public.device_sessions
for select using (user_id = auth.uid());

drop policy if exists device_sessions_insert_own on public.device_sessions;
create policy device_sessions_insert_own on public.device_sessions
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.devices
    where devices.id = device_sessions.device_id
      and devices.user_id = auth.uid()
      and devices.revoked_at is null
  )
);

drop policy if exists cloud_conversations_select_own on public.cloud_conversations;
create policy cloud_conversations_select_own on public.cloud_conversations
for select using (user_id = auth.uid());

drop policy if exists cloud_conversations_insert_own on public.cloud_conversations;
create policy cloud_conversations_insert_own on public.cloud_conversations
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.personas
    where personas.id = cloud_conversations.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);

drop policy if exists cloud_conversations_update_own on public.cloud_conversations;
create policy cloud_conversations_update_own on public.cloud_conversations
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cloud_conversation_messages_select_own on public.cloud_conversation_messages;
create policy cloud_conversation_messages_select_own on public.cloud_conversation_messages
for select using (user_id = auth.uid());

drop policy if exists cloud_conversation_messages_insert_own on public.cloud_conversation_messages;
create policy cloud_conversation_messages_insert_own on public.cloud_conversation_messages
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.cloud_conversations
    where cloud_conversations.id = cloud_conversation_messages.conversation_id
      and cloud_conversations.user_id = auth.uid()
      and cloud_conversations.deleted_at is null
  )
  and exists (
    select 1 from public.personas
    where personas.id = cloud_conversation_messages.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
  and (
    source_device_id is null
    or exists (
      select 1 from public.devices
      where devices.id = cloud_conversation_messages.source_device_id
        and devices.user_id = auth.uid()
        and devices.revoked_at is null
    )
  )
);

drop policy if exists conversation_sync_cursors_select_own on public.conversation_sync_cursors;
create policy conversation_sync_cursors_select_own on public.conversation_sync_cursors
for select using (user_id = auth.uid());

drop policy if exists conversation_sync_cursors_insert_own on public.conversation_sync_cursors;
create policy conversation_sync_cursors_insert_own on public.conversation_sync_cursors
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.devices
    where devices.id = conversation_sync_cursors.device_id
      and devices.user_id = auth.uid()
      and devices.revoked_at is null
  )
  and exists (
    select 1 from public.cloud_conversations
    where cloud_conversations.id = conversation_sync_cursors.conversation_id
      and cloud_conversations.user_id = auth.uid()
      and cloud_conversations.deleted_at is null
  )
);

drop policy if exists conversation_sync_cursors_update_own on public.conversation_sync_cursors;
create policy conversation_sync_cursors_update_own on public.conversation_sync_cursors
for update using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.devices
    where devices.id = conversation_sync_cursors.device_id
      and devices.user_id = auth.uid()
      and devices.revoked_at is null
  )
);

create or replace function public.upsert_cloud_conversation_message(
  p_conversation_id uuid,
  p_persona_id uuid,
  p_role text,
  p_content text,
  p_provider text,
  p_surface text,
  p_source_device_id uuid,
  p_local_message_id text,
  p_idempotency_key text,
  p_safety_grade text,
  p_client_created_at timestamptz,
  p_client_sequence integer
)
returns public.cloud_conversation_messages
language plpgsql
as $$
declare
  existing_message public.cloud_conversation_messages;
  inserted_message public.cloud_conversation_messages;
begin
  select *
  into existing_message
  from public.cloud_conversation_messages
  where user_id = auth.uid()
    and conversation_id = p_conversation_id
    and idempotency_key = p_idempotency_key;

  if existing_message.id is not null then
    return existing_message;
  end if;

  insert into public.cloud_conversation_messages (
    user_id,
    conversation_id,
    persona_id,
    role,
    content,
    provider,
    surface,
    source_device_id,
    local_message_id,
    idempotency_key,
    safety_grade,
    client_created_at,
    client_sequence
  )
  values (
    auth.uid(),
    p_conversation_id,
    p_persona_id,
    p_role,
    p_content,
    p_provider,
    p_surface,
    p_source_device_id,
    p_local_message_id,
    p_idempotency_key,
    p_safety_grade,
    p_client_created_at,
    p_client_sequence
  )
  returning * into inserted_message;

  update public.cloud_conversations
  set last_message_at = greatest(
    coalesce(last_message_at, inserted_message.client_created_at),
    inserted_message.client_created_at
  )
  where id = inserted_message.conversation_id
    and user_id = auth.uid();

  return inserted_message;
end;
$$;
