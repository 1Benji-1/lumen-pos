-- Migration: 20260928010000_settings_batch_a_receipts_and_labels.sql
-- Description: Agrega columnas a store_settings para personalización de comprobantes (logo, cajero, leyenda legal)
-- y opciones de formato e impresión de etiquetas de códigos de barras (tamaño, precio, nombre de tienda).

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS print_logo_on_ticket boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS print_cashier_name boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ticket_legal_disclaimer text,
  ADD COLUMN IF NOT EXISTS barcode_label_size text NOT NULL DEFAULT '50x30' CHECK (barcode_label_size IN ('50x30', '40x25')),
  ADD COLUMN IF NOT EXISTS barcode_label_show_price boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS barcode_label_show_store_name boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN store_settings.print_logo_on_ticket IS 'Si es true, se imprime el logo de la tienda en el encabezado del ticket térmico';
COMMENT ON COLUMN store_settings.print_cashier_name IS 'Si es true, se imprime el nombre del cajero en el comprobante';
COMMENT ON COLUMN store_settings.ticket_legal_disclaimer IS 'Leyenda o texto legal personalizada al pie del ticket de venta';
COMMENT ON COLUMN store_settings.barcode_label_size IS 'Tamaño por defecto de las etiquetas de códigos de barras (50x30 mm o 40x25 mm)';
COMMENT ON COLUMN store_settings.barcode_label_show_price IS 'Si se muestra el precio de venta en las etiquetas de códigos de barras';
COMMENT ON COLUMN store_settings.barcode_label_show_store_name IS 'Si se muestra el nombre comercial de la tienda en las etiquetas de códigos de barras';
