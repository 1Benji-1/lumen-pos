-- ============================================================
-- LUMEN-POS · Inventario: categories, products, product_variants
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATEGORIES
-- ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Ver categorías de mi tienda"
  on public.categories for select
  using (store_id = public.get_my_store_id());

create policy "Crear categorías en mi tienda"
  on public.categories for insert
  with check (store_id = public.get_my_store_id());

create policy "Editar categorías de mi tienda"
  on public.categories for update
  using (store_id = public.get_my_store_id());

create policy "Eliminar categorías de mi tienda"
  on public.categories for delete
  using (store_id = public.get_my_store_id());

-- ------------------------------------------------------------
-- 2. PRODUCTS
-- Es el "nombre general" del producto. El precio, stock y
-- código de barras viven en product_variants, no aquí.
-- ------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Ver productos de mi tienda"
  on public.products for select
  using (store_id = public.get_my_store_id());

create policy "Crear productos en mi tienda"
  on public.products for insert
  with check (store_id = public.get_my_store_id());

create policy "Editar productos de mi tienda"
  on public.products for update
  using (store_id = public.get_my_store_id());

create policy "Eliminar productos de mi tienda"
  on public.products for delete
  using (store_id = public.get_my_store_id());

-- ------------------------------------------------------------
-- 3. PRODUCT_VARIANTS
-- Cada producto tiene AL MENOS una variante (aunque sea "Único").
-- Aquí vive el precio, costo, stock y código de barras real.
--
-- store_id se repite aquí (en vez de solo en products) a propósito:
-- simplifica las políticas RLS (no hay que hacer join con products
-- solo para saber a qué tienda pertenece) y mejora el rendimiento
-- de las consultas del POS, que van a leer esta tabla constantemente.
-- ------------------------------------------------------------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null default 'Único',
  barcode text,
  sku text,
  cost_price numeric(10,2) not null default 0,
  sale_price numeric(10,2) not null default 0,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_at timestamptz not null default now()
);

alter table public.product_variants enable row level security;

create policy "Ver variantes de mi tienda"
  on public.product_variants for select
  using (store_id = public.get_my_store_id());

create policy "Crear variantes en mi tienda"
  on public.product_variants for insert
  with check (store_id = public.get_my_store_id());

create policy "Editar variantes de mi tienda"
  on public.product_variants for update
  using (store_id = public.get_my_store_id());

create policy "Eliminar variantes de mi tienda"
  on public.product_variants for delete
  using (store_id = public.get_my_store_id());

-- ------------------------------------------------------------
-- 4. Índices para búsquedas rápidas
-- El POS va a buscar productos constantemente por código de
-- barras (al escanear) y por store_id (para listar el catálogo).
-- ------------------------------------------------------------
create index idx_product_variants_barcode on public.product_variants(barcode);
create index idx_product_variants_store_id on public.product_variants(store_id);
create index idx_products_store_id on public.products(store_id);
create index idx_categories_store_id on public.categories(store_id);