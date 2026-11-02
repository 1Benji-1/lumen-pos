-- ------------------------------------------------------------
-- MIGRACIÓN: staff_and_roles
-- Catálogo de roles y permisos para Tienda de artículos
-- ------------------------------------------------------------

-- 1. Agregar columna email e is_active si no existen en public.users
alter table public.users add column if not exists email text;
alter table public.users add column if not exists is_active boolean not null default true;

-- 2. Poblar emails existentes desde auth.users
update public.users u
set email = a.email
from auth.users a
where u.id = a.id and (u.email is null or u.email = '');

-- 3. Actualizar la restricción check del rol para incluir stock_clerk
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('owner', 'admin', 'cashier', 'stock_clerk'));

-- 4. Funciones auxiliares de verificación de rol
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_store_admin_or_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role in ('owner', 'admin') from public.users where id = auth.uid()),
    false
  );
$$;

-- 5. Políticas RLS adicionales para gestión de personal de la misma tienda
drop policy if exists "Administradores pueden actualizar usuarios de su tienda" on public.users;
create policy "Administradores pueden actualizar usuarios de su tienda"
  on public.users for update
  using (
    store_id = public.get_my_store_id()
    and public.is_store_admin_or_owner()
    and (
      public.get_my_role() = 'owner'
      or role <> 'owner'
    )
  )
  with check (
    store_id = public.get_my_store_id()
  );

drop policy if exists "Administradores pueden crear perfiles de su tienda" on public.users;
create policy "Administradores pueden crear perfiles de su tienda"
  on public.users for insert
  with check (
    store_id = public.get_my_store_id()
    and public.is_store_admin_or_owner()
  );

drop policy if exists "Dueños pueden eliminar colaboradores de su tienda" on public.users;
create policy "Dueños pueden eliminar colaboradores de su tienda"
  on public.users for delete
  using (
    store_id = public.get_my_store_id()
    and public.get_my_role() = 'owner'
    and id <> auth.uid()
    and role <> 'owner'
  );
