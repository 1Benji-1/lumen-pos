-- Reproduce a restored environment where a manual change already removed the
-- obsolete overload. Keep the current three-argument RPC in place.
drop function public.refund_sale(uuid,text);
do $$begin
 if to_regprocedure('public.refund_sale(uuid,text)') is not null then
  raise exception 'Legacy refund overload must be absent before stabilization';
 end if;
 if to_regprocedure('public.refund_sale(uuid,text,uuid)') is null then
  raise exception 'Current refund RPC must remain present before stabilization';
 end if;
end $$;
