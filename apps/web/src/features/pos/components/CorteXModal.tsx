import { useEffect } from 'react'
import { useCashRegisterReport } from '../hooks/useCashRegister'

export function CorteXModal({
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

  return (
    <div className="fixed inset-0 bg-[#242423]/60 flex items-center justify-center p-4 z-50">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-corte-x, #printable-corte-x * {
            visibility: visible;
          }
          #printable-corte-x {
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

      <div className="bg-white border border-[#CFDBD5] rounded-2xl max-w-md w-full p-6 text-[#242423] max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center pb-3 border-b border-[#CFDBD5] no-print">
          <div>
            <h2 className="text-lg font-bold text-[#242423]">Corte X — Estado de caja</h2>
            <p className="text-xs text-[#5A5D5A]">Reporte intermedio sin cierre de turno</p>
          </div>
          <button onClick={onClose} className="text-[#5A5D5A] hover:text-[#242423] text-xs font-semibold p-1">
            ✕
          </button>
        </div>

        {isLoading && <p className="text-[#5A5D5A] py-8 text-center text-xs">Cargando reporte...</p>}
        {error && <p className="text-[#BC4749] py-8 text-center text-xs font-medium">Error al cargar el reporte.</p>}

        {report && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Vista imprimible */}
            <div
              id="printable-corte-x"
              className="bg-[#E8EDDF]/40 text-[#242423] p-5 rounded-xl border border-[#CFDBD5] text-xs font-mono space-y-3 print:bg-white print:text-black print:border-none print:p-0"
            >
              <div className="text-center border-b border-[#CFDBD5] pb-2 print:border-black">
                <p className="font-bold text-sm text-[#242423]">{storeName || 'LUMEN POS'}</p>
                <p className="uppercase tracking-wider font-semibold text-xs mt-0.5 text-[#242423]">
                  Reporte Intermedio (Corte X)
                </p>
                <p className="text-[#5A5D5A] print:text-black text-xs mt-1">
                  Apertura: {new Date(report.openedAt).toLocaleString()}
                </p>
                <p className="text-[#5A5D5A] print:text-black text-xs">
                  Corte generado: {new Date().toLocaleString()}
                </p>
                {report.openedByName && (
                  <p className="text-[#5A5D5A] print:text-black text-xs">
                    Cajero: {report.openedByName}
                  </p>
                )}
              </div>

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
                <div className="flex justify-between border-t border-[#CFDBD5] pt-1 print:border-black">
                  <span>Total ventas acumuladas ({report.totalSalesCount}):</span>
                  <span className="font-bold text-[#242423]">Bs {report.totalSalesAmount.toFixed(2)}</span>
                </div>
              </div>

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

              <div className="border-t-2 border-[#CFDBD5] pt-2.5 print:border-black">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-[#CFDBD5] print:bg-transparent print:border-none shadow-xs">
                  <span className="font-bold text-xs uppercase text-[#242423]">Efectivo esperado en caja:</span>
                  <span className="font-bold text-base text-[#588157] print:text-black">
                    Bs {report.expectedCashAmount.toFixed(2)}
                  </span>
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
            className="px-4 py-2 text-xs font-bold bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] rounded-md transition shadow-xs disabled:opacity-50"
          >
            Imprimir Corte X
          </button>
        </div>
      </div>
    </div>
  )
}
