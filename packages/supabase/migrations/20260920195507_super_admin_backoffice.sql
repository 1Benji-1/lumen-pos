-- ------------------------------------------------------------
-- MIGRACIÓN: super_admin_backoffice
-- Políticas de seguridad para administración de tiendas y feature overrides
-- ------------------------------------------------------------

-- 1. Función auxiliar para verificar si el usuario conectado es Super Administrador
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean,
    false
  );
$$;

-- 2. Políticas en public.stores para Super Admin
drop policy if exists "Super admins pueden ver todas las tiendas" on public.stores;
create policy "Super admins pueden ver todas las tiendas"
  on public.stores for select
  using (public.is_super_admin());

drop policy if exists "Super admins pueden actualizar todas las tiendas" on public.stores;
create policy "Super admins pueden actualizar todas las tiendas"
  on public.stores for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 3. Políticas en public.users para Super Admin
drop policy if exists "Super admins pueden ver todos los usuarios" on public.users;
create policy "Super admins pueden ver todos los usuarios"
  on public.users for select
  using (public.is_super_admin());

drop policy if exists "Super admins pueden actualizar todos los usuarios" on public.users;
create policy "Super admins pueden actualizar todos los usuarios"
  on public.users for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 4. Actualizar features base en la tabla plans
update public.plans
set features = '{
  "multiple_cash_registers": false,
  "advanced_analytics": false,
  "mobile_app": false,
  "batch_expiry_control": true
}'::jsonb
where code = 'standard';

update public.plans
set features = '{
  "multiple_cash_registers": true,
  "advanced_analytics": true,
  "mobile_app": true,
  "batch_expiry_control": true
}'::jsonb
where code in ('pro', 'enterprise');
