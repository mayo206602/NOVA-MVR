create extension if not exists pgcrypto;

create table if not exists access_keys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_user_id uuid null,
  max_accounts integer not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  is_admin boolean not null default false,
  key_id uuid null references access_keys(id) on delete set null,
  scope text not null default 'work' check (scope in ('system', 'work', 'family', 'both')),
  role_label text not null,
  family_calendar_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table access_keys
  add constraint access_keys_owner_user_id_fkey
  foreign key (owner_user_id) references app_users(id) on delete set null;

create table if not exists app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references access_keys(id) on delete cascade,
  scope text not null check (scope in ('work', 'family')),
  title text not null,
  description text not null default '',
  priority text not null default 'high' check (priority in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  due_at timestamptz null,
  creator_user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references access_keys(id) on delete cascade,
  scope text not null check (scope in ('work', 'family')),
  title text not null,
  description text not null default '',
  date date not null,
  start_time time null,
  end_time time null,
  location text not null default '',
  creator_user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references access_keys(id) on delete cascade,
  scope text not null check (scope in ('work', 'family')),
  title text not null,
  content text not null,
  summary text not null,
  creator_user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references access_keys(id) on delete cascade,
  scope text not null check (scope in ('work', 'family')),
  author_user_id uuid not null references app_users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_users_key_id on app_users(key_id);
create index if not exists idx_tasks_key_scope on tasks(key_id, scope);
create index if not exists idx_events_key_scope_date on events(key_id, scope, date);
create index if not exists idx_notes_key_scope on notes(key_id, scope);
create index if not exists idx_chat_messages_key_scope on chat_messages(key_id, scope, created_at);
