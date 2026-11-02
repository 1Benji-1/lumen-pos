import { useState, useEffect } from 'react'
import { BarcodeSvg } from './BarcodeSvg'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'
import { PlanGuard } from '../../../shared/guards/PlanGuard'

export interface LabelProductData {
  productName: string
  variantName: string
  salePrice: number
  barcode: string
  batchNumber?: string | null
  expiryDate?: string | null
}

export function BarcodeLabelModal({
  data,
  onClose,
}: {
  data: LabelProductData
  onClose: () => void
}) {
  const [quantity, setQuantity] = useState(1)
  const { settings } = useStoreSettings()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const labelSize = settings?.barcode_label_size ?? '50x30'
  const showPrice = settings?.barcode_label_show_price ?? true
  const showStoreName = settings?.barcode_label_show_store_name ?? false
  const storeName = settings?.commercial_name || 'LUMEN'
  const currency = settings?.currency_symbol || 'Bs'

  function handlePrint() {
    window.print()
  }

  const items = Array.from({ length: Math.max(1, quantity) })

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 bg-[#242423]/50 flex items-center justify-center p-4 z-50 animate-modal-backdrop"
    >
      {/* Estilos para impresión limpia de etiquetas según tamaño */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-labels, #printable-labels * {
            visibility: visible;
          }
          #printable-labels {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <PlanGuard feature="barcode_labels">
        <div className="bg-white border border-[#CFDBD5] rounded-xl max-w-xl w-full p-6 text-[#242423] shadow-xl max-h-[90vh] flex flex-col animate-modal-panel">
          <div className="flex justify-between items-center pb-4 border-b border-[#CFDBD5] no-print">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#242423]">Impresión de etiquetas</h2>
                <span className="text-[10px] font-semibold text-[#5A5D5A] bg-[#E8EDDF] px-2 py-0.5 rounded">
                  {labelSize === '40x25' ? '40 x 25 mm' : '50 x 30 mm'}
                </span>
              </div>
              <p className="text-xs text-[#5A5D5A]">
                {data.productName} {data.variantName !== 'Único' ? `(${data.variantName})` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded-lg hover:bg-[#E8EDDF] transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="my-4 no-print flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#5A5D5A] font-semibold uppercase tracking-wider">
                Cantidad de etiquetas:
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 bg-white border border-[#CFDBD5] rounded-md px-2.5 py-1 text-sm text-[#242423] tabular-nums focus:outline-none focus:border-[#242423]"
              />
            </div>
            <span className="text-[11px] text-[#5A5D5A]">
              Configurado en <strong className="text-[#242423]">Ajustes &gt; Comprobantes</strong>
            </span>
          </div>

          {/* Contenedor imprimible */}
          <div
            id="printable-labels"
            className="flex-1 overflow-y-auto p-4 bg-[#E8EDDF]/30 rounded-xl border border-[#CFDBD5] flex flex-wrap gap-4 justify-center"
          >
            {items.map((_, idx) => (
              <div
                key={idx}
                className={`bg-white text-[#242423] rounded-lg shadow-xs border border-[#CFDBD5] flex flex-col items-center text-center page-break-inside-avoid ${
                  labelSize === '40x25' ? 'w-44 p-2.5' : 'w-52 p-3'
                }`}
              >
                {/* Nombre de la tienda si está activo */}
                {showStoreName && (
                  <p className="text-[10px] font-semibold text-[#5A5D5A] uppercase tracking-wider truncate w-full mb-0.5">
                    {storeName}
                  </p>
                )}

                <p
                  className={`font-bold uppercase tracking-tight truncate w-full ${
                    labelSize === '40x25' ? 'text-[11px]' : 'text-xs'
                  }`}
                >
                  {data.productName}
                </p>

                {data.variantName !== 'Único' && (
                  <p className="text-[10px] text-[#5A5D5A] truncate w-full">{data.variantName}</p>
                )}

                <div className="my-1.5 w-full flex justify-center">
                  <BarcodeSvg value={data.barcode} height={labelSize === '40x25' ? 28 : 40} />
                </div>

                {/* Precio si está activo */}
                {showPrice && (
                  <p
                    className={`font-bold text-[#242423] mt-0.5 tabular-nums ${
                      labelSize === '40x25' ? 'text-xs' : 'text-sm'
                    }`}
                  >
                    {currency} {data.salePrice.toFixed(2)}
                  </p>
                )}

                {data.batchNumber && (
                  <p className="text-[9px] text-[#5A5D5A]">Lote: {data.batchNumber}</p>
                )}
                {data.expiryDate && (
                  <p className="text-[9px] text-[#5A5D5A]">Vence: {data.expiryDate}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3 no-print">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#242423] hover:bg-[#E8EDDF] bg-white border border-[#CFDBD5] rounded-md transition shadow-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] rounded-md transition shadow-xs cursor-pointer"
            >
              Imprimir {quantity} etiqueta{quantity > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </PlanGuard>
    </div>
  )
}
export default BarcodeLabelModal
