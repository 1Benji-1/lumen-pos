import { useEffect } from 'react'
import { useCashRegisterReport } from '../hooks/useCashRegister'

export function CorteZModal({
  cashRegisterId,
  storeName,
  onClose,
}: {
  cashRegisterId: string
  storeName: string
  onClose: () => void
}) {
  const { data: report, isLoading, error } = useCashRegisterReport(cashRegisterId)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handlePrint() {
    window.print()
  }

  const difference = report?.difference ?? 0
  const isBalanced = Math.abs(difference) < 0.01
  const isSurplus = difference > 0.009
  const isDeficit = difference < -0.009

  return (
    <div className="fixed inset-0 bg-[#242423]/60 flex items-center justify-center p-4 z-50">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-corte-z, #printable-corte-z * {
            visibility: visible;
          }
          #printable-corte-z {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
            background: white !important;
            color: black !important;
            padding: 16px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white border border-[#CFDBD5] rounded-2xl max-w-md w-full p-6 text-[#242423] max-h-[90vh] flex flex-col shadow-xl animate-modal-panel">
        <div className="flex justify-between items-center pb-3 border-b border-[#CFDBD5] no-print">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#242423]">Corte Z — Cierre de turno</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E5E5E5] text-[#242423] border border-[#CFDBD5]">
                Definitivo
              </span>
            </div>
            <p className="text-xs text-[#5A5D5A] mt-0.5">Comprobante oficial de cierre y conciliación de caja</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A5D5A] hover:text-[#242423] text-sm p-1.5 rounded-lg hover:bg-[#E5E5E5] transition"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {isLoading && <p className="text-[#5A5D5A] py-8 text-center text-xs">Cargando reporte de cierre...</p>}
        {error && <p className="text-[#BC4749] py-8 text-center text-xs font-medium">Error al cargar el reporte de cierre.</p>}

        {report && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Vista imprimible de Corte Z */}
            <div
              id="printable-corte-z"
              className="bg-white text-[#242423] p-5 rounded-xl border border-[#CFDBD5] text-xs font-mono space-y-3 print:bg-white print:text-black print:border-none print:p-0 shadow-2xs"
            >
              <div className="text-center border-b border-[#CFDBD5] pb-2 print:border-black">
                <p className="font-bold text-sm text-[#242423]">{storeName || 'LUMEN POS'}</p>
                <p className="uppercase tracking-wider font-semibold text-xs mt-0.5 text-[#242423]">
                  Cierre de Turno (Corte Z)
                </p>
                <p className="text-[#5A5D5A] print:text-black text-xs mt-1">
                  Apertura: {new Date(report.openedAt).toLocaleString()}
                </p>
                <p className="text-[#5A5D5A] print:text-black text-xs">
                  Cierre: {report.closedAt ? new Date(report.closedAt).toLocaleString() : '—'}
                </p>
                {report.openedByName && (
                  <p className="text-[#5A5D5A] print:text-black text-xs">
                    Cajero: {report.openedByName}
                  </p>
                )}
              </div>

              {/* Desglose de ventas */}
              <div className="space-y-1.5 py-1">
                <div className="flex justify-between">
                  <span>Monto inicial de apertura:</span>
                  <span className="font-semibold text-[#242423]">Bs {report.openingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas en efectivo ({report.cashSalesCount}):</span>
                  <span className="font-semibold text-[#242423]">Bs {report.cashSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas con tarjeta ({report.cardSalesCount}):</span>
                  <span className="font-semibold text-[#242423]">Bs {report.cardSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas QR ({report.qrSalesCount}):</span>
                  <span className="font-semibold text-[#242423]">Bs {report.qrSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas transf. ({report.transferSalesCount}):</span>
                  <span className="font-semibold text-[#242423]">Bs {report.transferSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-[#CFDBD5] pt-1 font-bold print:border-black">
                  <span>Total ventas acumuladas ({report.totalSalesCount}):</span>
                  <span className="text-[#242423]">Bs {report.totalSalesAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Movimientos de caja */}
              <div className="space-y-1.5 border-t border-[#CFDBD5] pt-2 print:border-black">
                <div className="flex justify-between text-[#588157] print:text-black">
                  <span>(+) Ingresos manuales ({report.cashInCount}):</span>
                  <span>Bs {report.cashInTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#BC4749] print:text-black">
                  <span>(-) Retiros manuales ({report.cashOutCount}):</span>
                  <span>Bs {report.cashOutTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Conciliación Oficial de Arqueo */}
              <div className="border-t-2 border-[#CFDBD5] pt-2.5 space-y-2 print:border-black">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5A5D5A] uppercase font-semibold">Efectivo esperado en sistema:</span>
                  <span className="font-mono font-semibold text-[#242423]">
                    Bs {report.expectedCashAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#242423] uppercase font-bold">Efectivo real contado en gaveta:</span>
                  <span className="font-mono font-bold text-sm text-[#242423]">
                    Bs {(report.actualClosingAmount ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-[#CFDBD5] bg-[#E8EDDF]/40 print:bg-transparent print:border-black">
                  <div className="flex justify-between items-center font-bold">
                    <span>Resultado de Arqueo:</span>
                    <span
                      className={`font-mono text-sm ${
                        isBalanced
                          ? 'text-[#588157] print:text-black'
                          : isSurplus
                          ? 'text-[#335c67] print:text-black'
                          : 'text-[#BC4749] print:text-black'
                      }`}
                    >
                      {difference >= 0 ? '+' : ''}
                      Bs {difference.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 font-sans font-medium text-right text-[#5A5D5A]">
                    {isBalanced && '✓ Caja perfectamente cuadrada (sin diferencias)'}
                    {isSurplus && '▲ Sobrante de efectivo registrado'}
                    {isDeficit && '▼ Faltante de efectivo en gaveta'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-[#CFDBD5] no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#242423] bg-[#E5E5E5] hover:bg-[#D5D5D5] rounded-md transition"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!report}
            className="px-4 py-2 text-xs font-bold bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] rounded-md transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Corte Z
          </button>
        </div>
      </div>
    </div>
  )
}
export default CorteZModal
