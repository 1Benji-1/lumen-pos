-- Migration: 20260928020000_settings_batch_b_inventory.sql
-- Description: Agrega columnas a store_settings para configuración operativa de inventario:
-- unidad por defecto, prefijo de código de barras interno, margen de ganancia objetivo,
-- conteo físico a ciegas y prefijo de órdenes de compra.

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS default_product_unit text NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS internal_barcode_prefix text NOT NULL DEFAULT '200',
  ADD COLUMN IF NOT EXISTS target_profit_margin numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blind_physical_count boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_order_prefix text NOT NULL DEFAULT 'OC-';

COMMENT ON COLUMN store_settings.default_product_unit IS 'Unidad de medida predeterminada al registrar nuevos productos (unit, kg, m, l, etc.)';
COMMENT ON COLUMN store_settings.internal_barcode_prefix IS 'Prefijo numérico o alfanumérico para la generación automática de códigos de barras internos (por defecto 200)';
COMMENT ON COLUMN store_settings.target_profit_margin IS 'Porcentaje de margen de ganancia objetivo para sugerir automáticamente el precio de venta al ingresar el costo';
COMMENT ON COLUMN store_settings.blind_physical_count IS 'Si es true, oculta el stock teórico del sistema en la pantalla de conteo físico (requiere Plan Enterprise)';
COMMENT ON COLUMN store_settings.purchase_order_prefix IS 'Prefijo para la numeración consecutiva de órdenes de compra a proveedores (por defecto OC-)';
