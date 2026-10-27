-- Status "dibaca" notifikasi lonceng admin, per admin. Hanya membuat tabel baru; tidak mengubah data yang ada.
create table if not exists public.admin_todo_reads (
  user_id uuid not null default auth.uid(),
  todo_id uuid not null references public.admin_todos(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, todo_id)
);
alter table public.admin_todo_reads enable row level security;
create policy admin_todo_reads_select on public.admin_todo_reads
  for select to authenticated using (is_admin() and user_id = auth.uid());
create policy admin_todo_reads_insert on public.admin_todo_reads
  for insert to authenticated with check (is_admin() and user_id = auth.uid());
create policy admin_todo_reads_delete on public.admin_todo_reads
  for delete to authenticated using (is_admin() and user_id = auth.uid());
