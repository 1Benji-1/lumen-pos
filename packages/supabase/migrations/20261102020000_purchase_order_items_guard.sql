begin;

-- Receipt locks the order before reading its items. Detail writes must lock the
-- same parent and reject terminal orders, including both parents when moving a
-- line. NOWAIT avoids deadlocks with an UPDATE/DELETE that already holds a line
-- tuple while receipt holds the parent and is about to lock that line.
create function public.guard_purchase_order_item_edit() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
 tenant uuid; parent_ids uuid[]; parent_id uuid; parent public.purchase_orders;
begin
 -- Trusted service/maintenance cascades retain their existing cleanup behavior.
 if current_user not in ('authenticated','anon') then
  return case when TG_OP='DELETE' then old else new end;
 end if;
 tenant:=public.require_store_role(array['owner','admin','stock_clerk'],'purchase_orders');
 parent_ids:=case when TG_OP='INSERT' then array[new.purchase_order_id]
  when TG_OP='DELETE' then array[old.purchase_order_id]
  else array[old.purchase_order_id,new.purchase_order_id] end;
 for parent_id in select distinct p.id from unnest(parent_ids) p(id) order by p.id loop
  select * into parent from public.purchase_orders where id=parent_id for update nowait;
  if not found then
   -- A pending parent authorized by the BEFORE DELETE guard below is already
   -- invisible during its FK cascade. Direct line deletion has depth 1.
   if TG_OP='DELETE' and pg_trigger_depth()>1 then return old; end if;
   raise exception 'Orden de compra no encontrada en tu tienda' using errcode='42501';
  end if;
  if parent.store_id<>tenant then
   raise exception 'Ítem fuera de tu tienda' using errcode='42501';
  end if;
  if parent.status not in ('draft','pending') then
   raise exception 'No se pueden modificar ítems de una orden recibida o cancelada' using errcode='55000';
  end if;
 end loop;
 return case when TG_OP='DELETE' then old else new end;
end $$;

create trigger stabilize_order_item_edit
before insert or update or delete on public.purchase_order_items
for each row execute function public.guard_purchase_order_item_edit();

-- Prevent deleting a terminal parent from bypassing the detail guard through
-- ON DELETE CASCADE; pending parent deletion and privileged cleanup still work.
create function public.guard_purchase_order_delete() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare tenant uuid;
begin
 if current_user not in ('authenticated','anon') then return old; end if;
 tenant:=public.require_store_role(array['owner','admin','stock_clerk'],'purchase_orders');
 if old.store_id<>tenant or old.status not in ('draft','pending') then
  raise exception 'No se puede eliminar una orden recibida o cancelada' using errcode='55000';
 end if;
 return old;
end $$;

create trigger stabilize_order_delete
before delete on public.purchase_orders
for each row execute function public.guard_purchase_order_delete();

commit;
