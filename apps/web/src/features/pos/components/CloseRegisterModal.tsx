import { useState, useEffect } from 'react'
import { useCloseRegisterMutation, useCashRegisterReport } from '../hooks/useCashRegister'
import type { CashRegisterReport } from '@lumen-pos/types'

export function CloseRegisterModal({
  storeId,
  cashRegisterId,
  storeName,
  onClose,
}: {
  storeId: string
  cashRegisterId: string
  storeName: string
  onClose: () => void
}) {
  const { data: report, isLoading: loadingReport } = useCashRegisterReport(cashRegisterId)
  const closeRegister = useCloseRegisterMutation(storeId)

  const [actualAmount, setActualAmount] = useState('')
  const [closedReport, setClosedReport] = useState<CashRegisterReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDenominations, setShowDenominations] = useState(false)

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
  const [bills, setBills] = useState({
    b200: '',
    b100: '',
    b50: '',
    b20: '',
    b10: '',
    coins: '',
  })

  function handleBillChange(key: keyof typeof bills, val: string) {
    const nextBills = { ...bills, [key]: val }
    setBills(nextBills)

    const sum =
      (Number(nextBills.b200) || 0) * 200 +
      (Number(nextBills.b100) || 0) * 100 +
      (Number(nextBills.b50) || 0) * 50 +
      (Number(nextBills.b20) || 0) * 20 +
      (Number(nextBills.b10) || 0) * 10 +
      (Number(nextBills.coins) || 0)

    setActualAmount(sum > 0 ? sum.toFixed(2) : '')
  }

  const counted = actualAmount !== '' ? Number(actualAmount) : null
  const expected = report?.expectedCashAmount ?? 0

  async function handleConfirmClose(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (counted === null || isNaN(counted) || counted < 0) {
      setError('Ingrese un monto válido de efectivo contado.')
      return
    }

    try {
      await closeRegister.mutateAsync({
        id: cashRegisterId,
        closingAmount: counted,
      })
      if (report) {
        setClosedReport({
          ...report,
          closedAt: new Date().toISOString(),
          actualClosingAmount: counted,
          difference: counted - expected,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar la caja')
    }
  }

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

      <div className="bg-white border border-[#CFDBD5] rounded-2xl max-w-lg w-full p-6 text-[#242423] max-h-[90vh] flex flex-col shadow-xl animate-modal-panel">
        <div className="flex justify-between items-center pb-3 border-b border-[#CFDBD5] no-print">
          <div>
            <h2 className="text-base font-bold text-[#242423]">
              {closedReport ? 'Corte Z — Cierre de turno finalizado' : 'Cierre de turno — Arqueo ciego'}
            </h2>
            <p className="text-xs text-[#5A5D5A]">
              {closedReport ? 'Comprobante y conciliación final del turno' : 'Conteo físico de efectivo en gaveta'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#5A5D5A] hover:text-[#242423] text-sm p-1.5 rounded-lg hover:bg-[#E5E5E5] transition" aria-label="Cerrar modal">
            ✕
          </button>
        </div>

        {loadingReport && <p className="text-[#5A5D5A] py-8 text-center">Cargando datos de caja...</p>}

        {!closedReport && report && (
          <form onSubmit={handleConfirmClose} className="space-y-4 my-4 overflow-y-auto pr-1">
            {/* Información del Turno para el Arqueo Ciego */}
            <div className="bg-[#E8EDDF]/40 p-4 rounded-xl border border-[#CFDBD5] space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#CFDBD5]">
                <span className="font-bold text-[#242423]">Turno de caja a cerrar:</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#F5CB5C]/20 text-[#242423] border border-[#F5CB5C]/40">
                  Arqueo Ciego
                </span>
              </div>

              <div className="space-y-1 text-[#5A5D5A] text-xs">
                <div className="flex justify-between">
                  <span>Responsable de caja:</span>
                  <span className="text-[#242423] font-medium">{report.openedByName || 'Cajero en turno'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Apertura del turno:</span>
                  <span className="text-[#242423] font-mono">{new Date(report.openedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de operaciones:</span>
                  <span className="text-[#242423] font-mono">{report.totalSalesCount} transacciones</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#CFDBD5] text-xs text-[#5A5D5A] leading-relaxed">
                🔒 <strong className="text-[#242423]">Auditoría a ciegas:</strong> Ingrese el monto físico total contado en la gaveta. Por política de control interno, el efectivo esperado por el sistema y las diferencias se revelarán únicamente tras confirmar el cierre en el comprobante final (Corte Z).
              </div>
            </div>

            {/* Desglose Opcional de Billetes y Monedas */}
            <div className="bg-[#E8EDDF]/40 p-3.5 rounded-xl border border-[#CFDBD5] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#242423]">
                  Desglose de billetes y monedas
                </span>
                <button
                  type="button"
                  onClick={() => setShowDenominations(!showDenominations)}
                  className="text-xs text-[#242423] hover:text-[#5A5D5A] underline font-medium"
                >
                  {showDenominations ? 'Ocultar calculadora' : '+ Desglosar por billetes (opcional)'}
                </button>
              </div>

              {showDenominations && (
                <div className="space-y-2 pt-2 border-t border-[#CFDBD5] text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#CFDBD5]">
                      <span className="font-mono text-[#242423] font-bold">Bs 200:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        aria-label="Cantidad de billetes de 200 Bs"
                        value={bills.b200}
                        onChange={(e) => handleBillChange('b200', e.target.value)}
                        className="w-16 rounded-md px-2 py-1 text-[#242423] bg-white border border-[#CFDBD5] text-right font-mono font-bold text-xs focus:outline-none focus:border-[#F5CB5C]"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#CFDBD5]">
                      <span className="font-mono text-[#242423] font-bold">Bs 100:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        aria-label="Cantidad de billetes de 100 Bs"
                        value={bills.b100}
                        onChange={(e) => handleBillChange('b100', e.target.value)}
                        className="w-16 rounded-md px-2 py-1 text-[#242423] bg-white border border-[#CFDBD5] text-right font-mono font-bold text-xs focus:outline-none focus:border-[#F5CB5C]"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#CFDBD5]">
                      <span className="font-mono text-[#242423] font-bold">Bs 50:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        aria-label="Cantidad de billetes de 50 Bs"
                        value={bills.b50}
                        onChange={(e) => handleBillChange('b50', e.target.value)}
                        className="w-16 rounded-md px-2 py-1 text-[#242423] bg-white border border-[#CFDBD5] text-right font-mono font-bold text-xs focus:outline-none focus:border-[#F5CB5C]"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#CFDBD5]">
                      <span className="font-mono text-[#242423] font-bold">Bs 20:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        aria-label="Cantidad de billetes de 20 Bs"
                        value={bills.b20}
                        onChange={(e) => handleBillChange('b20', e.target.value)}
                        className="w-16 rounded-md px-2 py-1 text-[#242423] bg-white border border-[#CFDBD5] text-right font-mono font-bold text-xs focus:outline-none focus:border-[#F5CB5C]"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#CFDBD5]">
                      <span className="font-mono text-[#242423] font-bold">Bs 10:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        aria-label="Cantidad de billetes de 10 Bs"
                        value={bills.b10}
                        onChange={(e) => handleBillChange('b10', e.target.value)}
                        className="w-16 rounded-md px-2 py-1 text-[#242423] bg-white border border-[#CFDBD5] text-right font-mono font-bold text-xs focus:outline-none focus:border-[#F5CB5C]"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#CFDBD5]">
                      <span className="font-mono text-[#242423] font-bold">Monedas:</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Bs 0.00"
                        aria-label="Monto en monedas"
                        value={bills.coins}
                        onChange={(e) => handleBillChange('coins', e.target.value)}
                        className="w-20 rounded-md px-2 py-1 text-[#242423] bg-white border border-[#CFDBD5] text-right font-mono font-bold text-xs focus:outline-none focus:border-[#F5CB5C]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#5A5D5A] italic">
                    * El cálculo de las denominaciones se suma automáticamente al total contado.
                  </p>
                </div>
              )}
            </div>

            {/* Input Principal de Efectivo Contado */}
            <div>
              <label className="block text-xs font-semibold text-[#242423] uppercase tracking-wider mb-1">
                Efectivo físico total contado en gaveta *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-[#5A5D5A] font-mono font-bold text-sm">
                  Bs
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  aria-label="Efectivo físico total contado en gaveta"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl pl-10 pr-3 py-2.5 text-[#242423] bg-white border border-[#CFDBD5] font-mono font-bold text-base focus:outline-none focus:border-[#F5CB5C] shadow-inner"
                />
              </div>
              <p className="text-xs text-[#5A5D5A] mt-1">
                Cuente billetes y monedas físicas en la caja e ingrese el total exacto.
              </p>
            </div>

            {error && <p className="text-[#BC4749] text-xs font-medium">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#242423] hover:bg-[#CFDBD5] bg-[#E5E5E5] rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={closeRegister.isPending || !actualAmount}
                className="px-5 py-2 text-xs font-bold bg-[#BC4749] hover:bg-[#a83b3d] text-white rounded-xl transition disabled:opacity-50 shadow-sm"
              >
                {closeRegister.isPending ? 'Cerrando turno...' : 'Confirmar cierre (Corte Z)'}
              </button>
            </div>
          </form>
        )}

        {closedReport && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div
              id="printable-corte-z"
              className="bg-white text-[#242423] p-5 rounded-xl border border-[#CFDBD5] text-xs font-mono space-y-3 print:bg-white print:text-black print:border-none print:p-0"
            >
              <div className="text-center border-b border-[#CFDBD5] pb-2 print:border-black">
                <p className="font-bold text-sm text-[#242423]">{storeName || 'LUMEN POS'}</p>
                <p className="uppercase tracking-wider font-semibold text-xs mt-0.5 text-[#242423]">
                  Cierre de Turno (Corte Z)
                </p>
                <p className="text-[#5A5D5A] print:text-black text-xs mt-1">
                  Apertura: {new Date(closedReport.openedAt).toLocaleString()}
                </p>
                <p className="text-[#5A5D5A] print:text-black text-xs">
                  Cierre: {new Date(closedReport.closedAt ?? Date.now()).toLocaleString()}
                </p>
                {closedReport.openedByName && (
                  <p className="text-[#5A5D5A] print:text-black text-xs">
                    Cajero: {closedReport.openedByName}
                  </p>
                )}
              </div>

              <div className="space-y-1 py-1">
                <div className="flex justify-between">
                  <span>Monto inicial:</span>
                  <span>Bs {closedReport.openingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas efectivo ({closedReport.cashSalesCount}):</span>
                  <span>Bs {closedReport.cashSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas tarjeta ({closedReport.cardSalesCount}):</span>
                  <span>Bs {closedReport.cardSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas QR ({closedReport.qrSalesCount}):</span>
                  <span>Bs {closedReport.qrSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas transf. ({closedReport.transferSalesCount}):</span>
                  <span>Bs {closedReport.transferSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-[#CFDBD5] pt-1 print:border-black">
                  <span>Total ventas ({closedReport.totalSalesCount}):</span>
                  <span>Bs {closedReport.totalSalesAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1 border-t border-[#CFDBD5] pt-1.5 print:border-black">
                <div className="flex justify-between">
                  <span>(+) Ingresos manuales ({closedReport.cashInCount}):</span>
                  <span>Bs {closedReport.cashInTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(-) Retiros manuales ({closedReport.cashOutCount}):</span>
                  <span>Bs {closedReport.cashOutTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Conciliación Revelada en el Corte Z */}
              <div className="border-t-2 border-[#CFDBD5] pt-2 space-y-1.5 print:border-black">
                <div className="flex justify-between">
                  <span>Efectivo esperado en sistema:</span>
                  <span className="font-semibold">Bs {closedReport.expectedCashAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Efectivo real contado:</span>
                  <span>Bs {(closedReport.actualClosingAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-[#CFDBD5] pt-1 print:border-black">
                  <span>Diferencia:</span>
                  <span
                    className={
                      Math.abs(closedReport.difference ?? 0) < 0.01
                        ? 'text-[#588157] print:text-black'
                        : (closedReport.difference ?? 0) > 0
                        ? 'text-[#335c67] print:text-black'
                        : 'text-[#BC4749] print:text-black'
                    }
                  >
                    {(closedReport.difference ?? 0) >= 0 ? '+' : ''}
                    Bs {(closedReport.difference ?? 0).toFixed(2)}
                    {Math.abs(closedReport.difference ?? 0) < 0.01 && ' (Caja cuadrada)'}
                    {(closedReport.difference ?? 0) > 0 && ' (Sobrante)'}
                    {(closedReport.difference ?? 0) < -0.01 && ' (Faltante)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#CFDBD5] no-print">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#242423] bg-[#E5E5E5] hover:bg-[#CFDBD5] rounded-xl transition"
              >
                Finalizar turno
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 text-xs font-bold bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] rounded-xl transition shadow-sm"
              >
                Imprimir Corte Z
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
