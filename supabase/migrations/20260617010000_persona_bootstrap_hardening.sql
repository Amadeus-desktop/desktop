alter table public.persona_states
  add column if not exists is_current boolean not null default true;

alter table public.persona_states
  alter column is_current set default true;

update public.persona_states
set is_current = true
where is_current is null;

alter table public.persona_states
  alter column is_current set not null;

with ranked_current_persona_states as (
  select
    id,
    row_number() over (
      partition by user_id, persona_id
      order by updated_at desc, created_at desc, id desc
    ) as current_rank
  from public.persona_states
  where is_current = true
)
update public.persona_states persona_states
set is_current = false
from ranked_current_persona_states ranked
where persona_states.id = ranked.id
  and ranked.current_rank > 1;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'persona_states_one_current_idx'
  ) then
    create unique index persona_states_one_current_idx
      on public.persona_states(user_id, persona_id)
      where is_current = true;
  end if;
end;
$$;

drop policy if exists persona_states_select_own on public.persona_states;
create policy persona_states_select_own
on public.persona_states
for select
using (
  user_id = auth.uid()
  and is_current = true
  and exists (
    select 1
    from public.personas
    where personas.id = persona_states.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);

drop policy if exists cloud_conversations_update_own on public.cloud_conversations;
create policy cloud_conversations_update_own on public.cloud_conversations
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.personas
    where personas.id = cloud_conversations.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);
