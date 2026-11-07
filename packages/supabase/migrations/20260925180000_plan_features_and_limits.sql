-- Actualización y enriquecimiento de las características y límites de los planes
-- Plan Standard, Plan Pro y Plan Business (Enterprise)

UPDATE public.plans
SET 
  name = 'Standard',
  features = jsonb_build_object(
    'multiple_cash_registers', false,
    'max_cash_registers', 1,
    'max_users', 2,
    'advanced_analytics', false,
    'split_payments', false,
    'purchase_orders', false,
    'batch_expiry_control', false,
    'barcode_labels', false,
    'physical_count', false,
    'batch_price_adjust', false,
    'custom_receipts', false,
    'mobile_app', false
  )
WHERE code = 'standard';

UPDATE public.plans
SET 
  name = 'Pro',
  features = jsonb_build_object(
    'multiple_cash_registers', true,
    'max_cash_registers', 3,
    'max_users', 6,
    'advanced_analytics', true,
    'split_payments', true,
    'purchase_orders', true,
    'batch_expiry_control', true,
    'barcode_labels', true,
    'physical_count', false,
    'batch_price_adjust', false,
    'custom_receipts', true,
    'mobile_app', true
  )
WHERE code = 'pro';

UPDATE public.plans
SET 
  name = 'Business',
  features = jsonb_build_object(
    'multiple_cash_registers', true,
    'max_cash_registers', 999,
    'max_users', 999,
    'advanced_analytics', true,
    'split_payments', true,
    'purchase_orders', true,
    'batch_expiry_control', true,
    'barcode_labels', true,
    'physical_count', true,
    'batch_price_adjust', true,
    'custom_receipts', true,
    'mobile_app', true
  )
WHERE code = 'enterprise';
