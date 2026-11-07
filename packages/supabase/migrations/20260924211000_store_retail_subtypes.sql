-- Migración: Sub-rubros especializados para el rubro Retail / Tienda de artículos
alter table public.stores
  add column if not exists industry_sub_type text not null default 'comercio_general'
  check (industry_sub_type in (
    'comercio_general',
    'minimarket_abarrotes',
    'ropa_calzado',
    'ferreteria_construccion',
    'farmacia_belleza',
    'libreria_papeleria',
    'tecnologia_celulares'
  ));

comment on column public.stores.industry_sub_type is 'Sub-rubro de retail para preajustes y adaptaciones en POS e inventario';
