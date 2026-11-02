-- ------------------------------------------------------------
-- MIGRACIÓN: get_admin_stores_overview_rpc
-- RPC para obtener el listado completo de tiendas con telemetría de ventas, cajas y personal para Super Admins
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_stores_overview()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(store_row), '[]'::jsonb)
  FROM (
    SELECT
      s.id,
      s.name,
      s.owner_id,
      s.business_type,
      s.industry_sub_type,
      s.plan_id,
      s.subscription_status,
      s.billing_cycle,
      s.trial_ends_at,
      s.created_at,
      s.feature_overrides,
      p.code as plan_code,
      p.name as plan_name,
      coalesce(p.features, '{}'::jsonb) as plan_features,
      u_owner.full_name as owner_name,
      u_owner.email as owner_email,
      (SELECT count(*)::int FROM public.products p_sub WHERE p_sub.store_id = s.id) as products_count,
      (SELECT count(*)::int FROM public.sales sa WHERE sa.store_id = s.id AND sa.status = 'completed') as sales_count,
      (SELECT coalesce(sum(sa.total), 0)::numeric FROM public.sales sa WHERE sa.store_id = s.id AND sa.status = 'completed') as total_revenue,
      (SELECT max(sa.created_at) FROM public.sales sa WHERE sa.store_id = s.id AND sa.status = 'completed') as last_sale_at,
      (SELECT count(*)::int FROM public.cash_registers cr WHERE cr.store_id = s.id AND cr.status = 'open') as open_registers_count,
      (SELECT count(*)::int FROM public.users u_count WHERE u_count.store_id = s.id AND u_count.is_active = true) as active_users_count,
      (SELECT count(*)::int FROM public.customers c_sub WHERE c_sub.store_id = s.id) as customers_count
    FROM public.stores s
    LEFT JOIN public.plans p ON p.id = s.plan_id
    LEFT JOIN LATERAL (
      SELECT full_name, email FROM public.users u
      WHERE u.store_id = s.id AND (u.role = 'owner' OR u.id = s.owner_id)
      ORDER BY (u.role = 'owner') DESC, u.created_at ASC
      LIMIT 1
    ) u_owner ON true
    ORDER BY s.created_at DESC
  ) store_row;
$$;
