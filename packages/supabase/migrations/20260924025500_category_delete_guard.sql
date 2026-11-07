-- ============================================================
-- LUMEN-POS · Categorías: Protección de eliminación
-- Evita eliminar una categoría si contiene productos asociados
-- ============================================================

create or replace function public.check_category_before_delete()
returns trigger
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.products
  where category_id = old.id;

  if v_count > 0 then
    raise exception 'No se puede eliminar la categoría "%" porque tiene % producto(s) asociado(s). Reasigna o elimina los productos primero.', old.name, v_count;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_check_category_before_delete on public.categories;
create trigger trg_check_category_before_delete
  before delete on public.categories
  for each row
  execute function public.check_category_before_delete();
