import type { PaymentMethodMetric } from '@lumen-pos/types'

const METHOD_DETAILS: Record<
  string,
  { label: string; badge: string; barColor: string }
> = {
  cash: {
    label: 'Efectivo en Caja',
    badge: 'Gaveta física',
    barColor: 'bg-[#588157]',
  },
  qr: {
    label: 'Pago QR (Simple)',
    badge: 'Billetera digital',
    barColor: 'bg-[#F5CB5C]',
  },
  card: {
    label: 'Tarjeta Débito / Crédito',
    badge: 'Terminal POS',
    barColor: 'bg-[#242423]',
  },
  transfer: {
    label: 'Transferencia Bancaria',
    badge: 'Banca en línea',
    barColor: 'bg-[#5A5D5A]',
  },
}

function getMethodInfo(methodKey: string) {
  return (
    METHOD_DETAILS[methodKey] ?? {
      label: methodKey.toUpperCase(),
      badge: 'Otros',
      barColor: 'bg-[#CFDBD5]',
    }
  )
}

export function PaymentMethodsCard({ data }: { data: PaymentMethodMetric[] }) {
  const totalAmount = data.reduce((acc, curr) => acc + curr.total, 0)
  const totalCount = data.reduce((acc, curr) => acc + curr.count, 0)

  const cashItems = data.filter((item) => item.method === 'cash')
  const digitalItems = data.filter((item) => item.method !== 'cash')

  const cashTotal = cashItems.reduce((acc, curr) => acc + curr.total, 0)
  const cashCount = cashItems.reduce((acc, curr) => acc + curr.count, 0)
  const cashPct = totalAmount > 0 ? (cashTotal / totalAmount) * 100 : 0

  const digitalTotal = digitalItems.reduce((acc, curr) => acc + curr.total, 0)
  const digitalCount = digitalItems.reduce((acc, curr) => acc + curr.count, 0)
  const digitalPct = totalAmount > 0 ? (digitalTotal / totalAmount) * 100 : 0

  return (
    <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#CFDBD5] mb-5">
          <div>
            <h3 className="text-sm font-bold text-[#242423] uppercase tracking-wider">
              Métodos de Pago
            </h3>
            <p className="text-xs text-[#5A5D5A] mt-0.5">Distribución de cobros y arqueo</p>
          </div>
          <span className="text-xs text-[#5A5D5A] font-medium bg-[#E8EDDF]/60 px-2.5 py-1 rounded-md border border-[#CFDBD5] tabular-nums">
            {totalCount} cobro{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        {data.length === 0 ? (
          <p className="text-xs text-[#5A5D5A] italic py-8 text-center">
            Sin transacciones registradas en este período
          </p>
        ) : (
          <div className="space-y-5">
            {/* BLOQUE OPERATIVO 1: Efectivo en Caja (Para Arqueo) */}
            <div className="bg-[#EFF5EE]/40 border border-[#BBD2B8]/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#588157]/15 border border-[#588157]/30 text-[#588157] flex items-center justify-center shrink-0">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#242423]">Efectivo en Caja</h4>
                    <p className="text-xs text-[#588157] font-medium">Gaveta física · Arqueo diario</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#242423] tabular-nums">
                    Bs {cashTotal.toFixed(2)}
                  </span>
                  <p className="text-xs text-[#5A5D5A] tabular-nums">
                    {cashPct.toFixed(1)}% · {cashCount} cobro{cashCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div aria-hidden="true" className="w-full bg-[#E8EDDF] rounded-full h-2 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, Math.max(0, cashPct))}%` }}
                  className="h-full bg-[#588157] rounded-full transition-all duration-300"
                />
              </div>
            </div>

            {/* BLOQUE OPERATIVO 2: Dinero Digital / Banco (Para Conciliación) */}
            <div className="bg-[#FAFBF9] border border-[#CFDBD5] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#CFDBD5]/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#242423]/10 border border-[#CFDBD5] text-[#242423] flex items-center justify-center shrink-0">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#242423]">Dinero Digital / Banco</h4>
                    <p className="text-xs text-[#5A5D5A] font-medium">QR, Tarjetas y Transferencias · Conciliación</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#242423] tabular-nums">
                    Bs {digitalTotal.toFixed(2)}
                  </span>
                  <p className="text-xs text-[#5A5D5A] tabular-nums">
                    {digitalPct.toFixed(1)}% · {digitalCount} cobro{digitalCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {digitalItems.length === 0 ? (
                <p className="text-xs text-[#5A5D5A] italic text-center py-2">
                  Sin cobros digitales registrados
                </p>
              ) : (
                <div className="space-y-3 pt-1">
                  {digitalItems.map((item) => {
                    const info = getMethodInfo(item.method)
                    const percentage = totalAmount > 0 ? (item.total / totalAmount) * 100 : 0

                    return (
                      <div key={item.method} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#242423] font-semibold">{info.label}</span>
                            <span className="text-xs text-[#5A5D5A] bg-[#E8EDDF] px-1.5 py-0.5 rounded font-mono">
                              {info.badge}
                            </span>
                          </div>
                          <span className="text-[#242423] font-medium tabular-nums">
                            Bs {item.total.toFixed(2)}{' '}
                            <span className="text-[#5A5D5A] font-mono text-xs">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                        <div aria-hidden="true" className="w-full bg-[#E8EDDF] rounded-full h-1.5 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${info.barColor}`}
                          />
                        </div>
                        <p className="text-xs text-[#5A5D5A] text-right tabular-nums">
                          {item.count} cobro{item.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resumen total pie de tarjeta */}
      <div className="mt-6 pt-4 border-t border-[#CFDBD5] flex items-center justify-between text-xs">
        <span className="font-semibold text-[#5A5D5A]">Total Recaudado</span>
        <span className="font-bold text-[#242423] text-sm tabular-nums">
          Bs {totalAmount.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
