create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type varchar(20) not null check (type in ('issue', 'idea')),
  title varchar(255) not null,
  description text not null,
  page_url text,
  user_email text,
  user_role text,
  store_name text,
  status varchar(20) not null default 'pending' check (status in ('pending', 'in_review', 'resolved', 'dismissed')),
  admin_notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.app_feedback enable row level security;

drop policy if exists "Authenticated users can submit feedback" on public.app_feedback;
create policy "Authenticated users can submit feedback"
  on public.app_feedback for insert
  to authenticated
  with check (true);

drop policy if exists "Users can view feedback from their own store" on public.app_feedback;
create policy "Users can view feedback from their own store"
  on public.app_feedback for select
  to authenticated
  using (
    store_id = get_my_store_id() or is_super_admin()
  );

drop policy if exists "Super admins can manage all feedback" on public.app_feedback;
create policy "Super admins can manage all feedback"
  on public.app_feedback for all
  to authenticated
  using (
    is_super_admin()
  );

