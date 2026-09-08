-- ============================================================
-- LUMEN-POS · Quitar "credit" como método de pago válido
-- Las tiendas objetivo no usan sistema de fiado.
-- ============================================================

alter table public.sales
  drop constraint sales_payment_method_check;

alter table public.sales
  add constraint sales_payment_method_check
  check (payment_method in ('cash', 'card'));