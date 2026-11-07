-- ------------------------------------------------------------
-- MIGRACIÓN: super_admin_extended_permissions
-- Permite estado 'suspended' y lectura/gestión de telemetría, cajas, ventas y productos para Super Admins
-- ------------------------------------------------------------

-- 1. Actualizar check constraint para permitir 'suspended'
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_subscription_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_subscription_status_check 
  CHECK (subscription_status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'suspended'::text]));

-- 2. Políticas de Super Admin en cash_registers
DROP POLICY IF EXISTS "Super admins pueden ver todas las cajas" ON public.cash_registers;
CREATE POLICY "Super admins pueden ver todas las cajas"
  ON public.cash_registers FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins pueden actualizar todas las cajas" ON public.cash_registers;
CREATE POLICY "Super admins pueden actualizar todas las cajas"
  ON public.cash_registers FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 3. Políticas de Super Admin en sales
DROP POLICY IF EXISTS "Super admins pueden ver todas las ventas" ON public.sales;
CREATE POLICY "Super admins pueden ver todas las ventas"
  ON public.sales FOR SELECT
  USING (public.is_super_admin());

-- 4. Políticas de Super Admin en products
DROP POLICY IF EXISTS "Super admins pueden ver todos los productos" ON public.products;
CREATE POLICY "Super admins pueden ver todos los productos"
  ON public.products FOR SELECT
  USING (public.is_super_admin());

-- 5. Políticas de Super Admin en customers
DROP POLICY IF EXISTS "Super admins pueden ver todos los clientes" ON public.customers;
CREATE POLICY "Super admins pueden ver todos los clientes"
  ON public.customers FOR SELECT
  USING (public.is_super_admin());
