-- Run this in the Supabase SQL editor for your project.
-- Enables per-user todos with Row Level Security.

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_user_id_idx on public.todos (user_id);

alter table public.todos enable row level security;

create policy "todos_select_own"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "todos_insert_own"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "todos_update_own"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "todos_delete_own"
  on public.todos for delete
  using (auth.uid() = user_id);

-- Keep updated_at in sync on row changes.
create or replace function public.handle_todos_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_todos_updated
  before update on public.todos
  for each row
  execute function public.handle_todos_updated_at();
