begin;

-- stores remains the tenant and subscription boundary. A branch is a location
-- inside that tenant; operational tables still belong to store_id.
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  category_id text not null check (category_id in (
    'comercio_general', 'minimarket_abarrotes', 'ropa_calzado',
    'ferreteria_construccion', 'farmacia_belleza', 'libreria_papeleria',
    'tecnologia_celulares', 'repuestos', 'tienda_mascotas',
    'restaurante_tradicional', 'cafeteria', 'bar', 'panaderia',
    'comida_rapida', 'dark_kitchen', 'barberia_belleza', 'lavanderia',
    'taller', 'servicio_tecnico', 'mayorista_general', 'distribuidor'
  )),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, store_id)
);
create unique index branches_one_primary_per_store on public.branches(store_id) where is_primary;
create index branches_store_id_idx on public.branches(store_id);

create function public.legacy_store_category(p_business_type text, p_industry_sub_type text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case
    when p_business_type='restaurante' then 'restaurante_tradicional'
    when p_business_type='supermercado' then 'minimarket_abarrotes'
    when p_business_type='tienda_articulos' and p_industry_sub_type in (
      'comercio_general', 'minimarket_abarrotes', 'ropa_calzado',
      'ferreteria_construccion', 'farmacia_belleza',
      'libreria_papeleria', 'tecnologia_celulares'
    ) then p_industry_sub_type
    else 'comercio_general'
  end;
$$;

insert into public.branches(store_id, name, category_id, is_primary)
select s.id, s.name, public.legacy_store_category(s.business_type, s.industry_sub_type), true
from public.stores s;

create function public.sync_primary_branch_from_store()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.branches
  set name=new.name,
      category_id=public.legacy_store_category(new.business_type, new.industry_sub_type),
      updated_at=now()
  where store_id=new.id and is_primary;
  if not found then
    insert into public.branches(store_id, name, category_id, is_primary)
    values (new.id, new.name, public.legacy_store_category(new.business_type, new.industry_sub_type), true);
  end if;
  return new;
end $$;

create trigger sync_primary_branch_after_store_write
after insert or update of name, business_type, industry_sub_type on public.stores
for each row execute function public.sync_primary_branch_from_store();

alter table public.branches enable row level security;
create policy "Read branches of own active store or superadmin"
on public.branches for select to authenticated
using (store_id=public.get_my_store_id() or public.is_super_admin());
revoke all on public.branches from public, anon, authenticated;
grant select on public.branches to authenticated;
grant all on public.branches to service_role;

revoke all on function public.legacy_store_category(text,text) from public, anon, authenticated;

commit;
