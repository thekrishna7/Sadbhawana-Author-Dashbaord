-- 1. Drop existing tables (this automatically drops associated recursive policies and triggers, and removes them from publications)
drop table if exists messages cascade;
drop table if exists conversation_participants cascade;
drop table if exists conversations cascade;

-- 3. Create Conversations Table
create table conversations (
  id uuid primary key default gen_random_uuid(),
  name text,
  type text,
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  -- Compatibility fields for Next.js frontend
  book_id uuid references books(id) on delete cascade,
  conversation_type public.conversation_type default 'general',
  title text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Create Conversation Participants Table
create table conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',
  created_at timestamp with time zone default now(),
  last_read_at timestamp with time zone default now(),
  constraint unique_conversation_participant unique (conversation_id, user_id)
);

-- 5. Create Messages Table
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text,
  attachment_url text,
  -- Compatibility field for Next.js frontend
  attachments jsonb,
  created_at timestamp with time zone default now()
);

-- 6. Add Triggers to Keep Compatibility Fields in Sync
create or replace function sync_conversation_fields()
returns trigger as $$
begin
  -- Sync name and title
  if new.name is null and new.title is not null then
    new.name := new.title;
  elsif new.title is null and new.name is not null then
    new.title := new.name;
  elsif new.name is not null and new.title is not null and new.name <> new.title then
    new.name := new.title;
  end if;

  -- Sync type and conversation_type
  if new.type is null and new.conversation_type is not null then
    new.type := new.conversation_type::text;
  elsif new.conversation_type is null and new.type is not null then
    new.conversation_type := new.type::public.conversation_type;
  elsif new.type is not null and new.conversation_type is not null and new.type <> new.conversation_type::text then
    new.type := new.conversation_type::text;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trigger_sync_conversations
before insert or update on conversations
for each row
execute function sync_conversation_fields();

create or replace function sync_message_attachments()
returns trigger as $$
begin
  -- Sync attachments (jsonb) to attachment_url (text)
  if new.attachments is not null and jsonb_array_length(new.attachments) > 0 and new.attachment_url is null then
    new.attachment_url := new.attachments->0->>'url';
  -- Sync attachment_url (text) to attachments (jsonb)
  elsif new.attachment_url is not null and new.attachments is null then
    new.attachments := jsonb_build_array(
      jsonb_build_object(
        'name', coalesce(substring(new.attachment_url from '[^/]+$'), 'attachment'),
        'url', new.attachment_url,
        'type', 'file',
        'size', 0
      )
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_sync_messages
before insert or update on messages
for each row
execute function sync_message_attachments();

-- 7. Enable Row Level Security (RLS)
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- 8. Safe Non-Recursive RLS Policies
-- conversation_participants policies
create policy "Allow view participants"
on conversation_participants
for select
to authenticated
using (true); -- Broad view access to break recursive loops entirely

create policy "Allow insert participants"
on conversation_participants
for insert
to authenticated
with check (true);

create policy "Allow update participants"
on conversation_participants
for update
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from profiles where id = auth.uid() and role = 'super_admin'
));

create policy "Allow delete participants"
on conversation_participants
for delete
to authenticated
using (user_id = auth.uid() or exists (
  select 1 from profiles where id = auth.uid() and role = 'super_admin'
));

-- conversations policies
create policy "Allow view conversations"
on conversations
for select
to authenticated
using (
  exists (
    select 1 from conversation_participants
    where conversation_participants.conversation_id = id
      and conversation_participants.user_id = auth.uid()
  )
  or created_by = auth.uid()
);

create policy "Allow insert conversations"
on conversations
for insert
to authenticated
with check (true);

create policy "Allow update conversations"
on conversations
for update
to authenticated
using (
  exists (
    select 1 from conversation_participants
    where conversation_participants.conversation_id = id
      and conversation_participants.user_id = auth.uid()
  )
  or created_by = auth.uid()
);

create policy "Allow delete conversations"
on conversations
for delete
to authenticated
using (
  exists (
    select 1 from conversation_participants
    where conversation_participants.conversation_id = id
      and conversation_participants.user_id = auth.uid()
  )
  or created_by = auth.uid()
);

-- messages policies
create policy "Allow view messages"
on messages
for select
to authenticated
using (
  exists (
    select 1 from conversation_participants
    where conversation_participants.conversation_id = conversation_id
      and conversation_participants.user_id = auth.uid()
  )
);

create policy "Allow insert messages"
on messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from conversation_participants
    where conversation_participants.conversation_id = conversation_id
      and conversation_participants.user_id = auth.uid()
  )
);

create policy "Allow update messages"
on messages
for update
to authenticated
using (sender_id = auth.uid());

create policy "Allow delete messages"
on messages
for delete
to authenticated
using (sender_id = auth.uid());

-- 9. Re-enable Realtime replication
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table conversation_participants;
alter publication supabase_realtime add table messages;
