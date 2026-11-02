alter table public.stores
  add column business_type text not null default 'tienda_articulos'
  check (business_type in ('tienda_articulos', 'restaurante', 'supermercado'));
