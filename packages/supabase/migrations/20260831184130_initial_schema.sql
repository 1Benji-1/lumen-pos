-- ============================================================
-- LUMEN-POS · Migración inicial
-- Tablas: plans, stores, users (perfiles vinculados a auth.users)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PLANS
-- Catálogo de planes disponibles (standard / pro / enterprise).
-- Es una tabla de referencia: la lee cualquiera (autenticado o no),
-- pero solo el backend/admin la modifica.
-- ------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('standard', 'pro', 'enterprise')),
  name text not null,
  monthly_price numeric(10,2) not null,
  semiannual_price numeric(10,2) not null,
  annual_price numeric(10,2) not null,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

-- Cualquiera puede leer los planes (es información pública de precios)
create policy "Los planes son visibles para todos"
  on public.plans for select
  using (true);

-- ------------------------------------------------------------
-- 2. STORES
-- Cada fila es una tienda/tenant. Todo lo demás en el sistema
-- cuelga de un store_id que apunta aquí.
-- ------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),
  billing_cycle text
    check (billing_cycle in ('monthly', 'semiannual', 'annual')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

alter table public.stores enable row level security;

-- ------------------------------------------------------------
-- 3. USERS (perfiles)
-- Supabase ya maneja auth.users (login/password/email).
-- Esta tabla es el "perfil" de negocio: a qué tienda pertenece
-- y qué rol tiene dentro de ella.
-- ------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  full_name text,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'cashier')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- ------------------------------------------------------------
-- 4. FUNCIÓN AUXILIAR: get_my_store_id()
-- Las políticas RLS de abajo necesitan saber "¿a qué tienda
-- pertenece el usuario que está haciendo la consulta?".
-- Si esa lógica se pusiera directo en la policy de "users",
-- se generaría una referencia circular (RLS de users consultando
-- users). Por eso se aísla en una función SECURITY DEFINER,
-- que se ejecuta con permisos elevados y evita el problema.
-- ------------------------------------------------------------
create function public.get_my_store_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select store_id from public.users where id = auth.uid();
$$;

-- ------------------------------------------------------------
-- 5. POLÍTICAS RLS — STORES
-- Un usuario solo puede ver/editar la tienda a la que pertenece.
-- ------------------------------------------------------------
create policy "Ver solo mi propia tienda"
  on public.stores for select
  using (id = public.get_my_store_id());

create policy "Actualizar solo mi propia tienda"
  on public.stores for update
  using (id = public.get_my_store_id());

-- El INSERT de una tienda nueva ocurre durante el registro,
-- antes de que exista un perfil en "users" ligado a ella.
-- Se permite si el usuario autenticado va a ser el owner.
create policy "Crear tienda propia al registrarse"
  on public.stores for insert
  with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- 6. POLÍTICAS RLS — USERS
-- Un usuario ve/edita solo los perfiles de SU MISMA tienda.
-- Esto es lo que garantiza el aislamiento multi-tenant real:
-- ninguna tienda ve empleados de otra tienda.
-- ------------------------------------------------------------
create policy "Ver perfiles de mi misma tienda"
  on public.users for select
  using (store_id = public.get_my_store_id());

create policy "Actualizar mi propio perfil"
  on public.users for update
  using (id = auth.uid());

-- Un usuario puede crear su propio perfil (ej. al completar el
-- registro), pero no perfiles de otras personas.
create policy "Crear mi propio perfil"
  on public.users for insert
  with check (id = auth.uid());

-- ------------------------------------------------------------
-- 7. SEED de planes (datos base, no de prueba)
-- Puedes ajustar precios y features cuando los definamos.
-- ------------------------------------------------------------
insert into public.plans (code, name, monthly_price, semiannual_price, annual_price, features)
values
  ('standard', 'Standard', 0, 0, 0, '{}'::jsonb),
  ('pro', 'Pro', 0, 0, 0, '{}'::jsonb),
  ('enterprise', 'Enterprise', 0, 0, 0, '{}'::jsonb);