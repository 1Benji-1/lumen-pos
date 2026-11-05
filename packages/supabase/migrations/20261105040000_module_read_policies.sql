begin;

-- PostgreSQL permissive policies combine with OR. Replace all earlier SELECT
-- policies on sensitive relations so an old tenant-only rule cannot bypass a
-- role permission. Superadmin MFA access remains in each replacement policy.
do $$declare item record; begin
 for item in
   select tablename,policyname from pg_policies
   where schemaname='public' and cmd='SELECT' and tablename=any(array[
     'sales','sale_items','sale_payments','cash_registers','cash_movements',
     'customers','products','product_variants','categories','stock_movements',
     'suppliers','purchase_orders','purchase_order_items','users'])
 loop
   execute format('drop policy %I on public.%I',item.policyname,item.tablename);
 end loop;
end $$;

create policy module_read_sales on public.sales for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (public.has_store_permission('pos:access') or public.has_store_permission('analytics:view'))));
create policy module_read_sale_items on public.sale_items for select to authenticated using
 (public.is_super_admin() or exists(select 1 from public.sales s
  where s.id=sale_id and s.store_id=public.get_my_store_id()));
create policy module_read_sale_payments on public.sale_payments for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (public.has_store_permission('pos:access') or public.has_store_permission('analytics:view'))));

create policy module_read_cash_registers on public.cash_registers for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (public.has_store_permission('pos:audit_cash') or
   (public.has_store_permission('pos:manage_cash') and opened_by=auth.uid()))));
create policy module_read_cash_movements on public.cash_movements for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (public.has_store_permission('pos:audit_cash') or
   (public.has_store_permission('pos:manage_cash') and exists(
     select 1 from public.cash_registers cr where cr.id=cash_register_id
       and cr.store_id=store_id and cr.opened_by=auth.uid())))));

create policy module_read_customers on public.customers for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  public.has_store_permission('customers:view')));
create policy module_read_products on public.products for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (public.has_store_permission('inventory:view') or
   (public.has_store_permission('pos:access') and public.is_active_module('pos')))));
create policy module_read_product_variants on public.product_variants for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (public.has_store_permission('inventory:view') or
   (public.has_store_permission('pos:access') and public.is_active_module('pos')))));
create policy module_read_categories on public.categories for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (public.has_store_permission('inventory:view') or
   (public.has_store_permission('pos:access') and public.is_active_module('pos')))));
create policy module_read_stock_movements on public.stock_movements for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  public.has_store_permission('inventory:view')));
create policy module_read_suppliers on public.suppliers for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  public.has_store_permission('inventory:manage')));
create policy module_read_purchase_orders on public.purchase_orders for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  public.has_store_permission('inventory:manage')));
create policy module_read_purchase_order_items on public.purchase_order_items for select to authenticated using
 (public.is_super_admin() or exists(select 1 from public.purchase_orders po
  where po.id=purchase_order_id and po.store_id=public.get_my_store_id()));
create policy module_read_users on public.users for select to authenticated using
 (public.is_super_admin() or (store_id=public.get_my_store_id() and
  (id=auth.uid() or public.has_store_permission('staff:view'))));

alter view public.customer_metrics set (security_invoker=true);
revoke all on public.customer_metrics from public,anon;
grant select on public.customer_metrics to authenticated;

-- Only ID and opener name are returned for the single-register conflict.
create function public.get_open_register_notice()
returns table(id uuid,opened_by_name text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare tenant uuid;
begin
 tenant:=public.require_active_module('pos','pos:manage_cash');
 return query
  select cr.id,u.full_name from public.cash_registers cr
  join public.users u on u.id=cr.opened_by and u.store_id=cr.store_id
  where cr.store_id=tenant and cr.status='open'
  order by cr.opened_at desc limit 1;
end $$;
revoke all on function public.get_open_register_notice() from public,anon;
grant execute on function public.get_open_register_notice() to authenticated;

commit;
