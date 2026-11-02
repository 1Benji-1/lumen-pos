-- Tabla de configuraciones y ajustes de tienda
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  
  -- Identidad y Datos del Negocio
  legal_name text,
  commercial_name text,
  tax_id text, -- NIT, RUC, RFC, RUT, etc.
  phone text,
  email text,
  address text,
  city text,
  country text default 'Bolivia',
  logo_url text,

  -- Regionalización y Horas
  timezone text not null default 'America/La_Paz',
  currency_symbol text not null default 'Bs',
  currency_code text not null default 'BOB',
  decimal_places integer not null default 2,
  
  -- Políticas de Punto de Venta y Cajas
  allow_negative_stock boolean not null default true,
  max_cash_register_hours integer not null default 16,
  default_opening_cash numeric(10,2) not null default 0.00,
  require_customer_for_sale boolean not null default false,

  -- Configuración de Tickets Térmicos
  ticket_header text,
  ticket_footer text default '¡Gracias por su compra! Vuelva pronto.',
  auto_print_ticket boolean not null default true,
  show_tax_details boolean not null default false,

  -- Políticas de Inventario y Alertas
  default_low_stock_threshold integer not null default 5,
  expiry_alert_days integer not null default 30,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Políticas RLS
alter table public.store_settings enable row level security;

drop policy if exists "Ver configuracion de mi tienda" on public.store_settings;
create policy "Ver configuracion de mi tienda"
  on public.store_settings for select
  using (store_id = public.get_my_store_id() or is_super_admin());

drop policy if exists "Modificar configuracion de mi tienda" on public.store_settings;
create policy "Modificar configuracion de mi tienda"
  on public.store_settings for update
  using (store_id = public.get_my_store_id() or is_super_admin())
  with check (store_id = public.get_my_store_id() or is_super_admin());

drop policy if exists "Insertar configuracion de mi tienda" on public.store_settings;
create policy "Insertar configuracion de mi tienda"
  on public.store_settings for insert
  with check (store_id = public.get_my_store_id() or is_super_admin());

-- Poblar settings por defecto para todas las tiendas existentes
insert into public.store_settings (store_id, commercial_name)
select id, name from public.stores
on conflict (store_id) do nothing;

-- Trigger para inicializar automáticamente store_settings cuando se cree una nueva tienda
create or replace function public.handle_new_store_settings()
returns trigger as $$
begin
  insert into public.store_settings (store_id, commercial_name)
  values (new.id, new.name)
  on conflict (store_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_store_created_settings on public.stores;
create trigger on_store_created_settings
  after insert on public.stores
  for each row execute function public.handle_new_store_settings();
