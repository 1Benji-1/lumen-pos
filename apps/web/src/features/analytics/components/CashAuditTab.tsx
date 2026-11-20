import { useState } from 'react'
import type { CashAuditSummary } from '@lumen-pos/types'
import { StickyTableWrapper } from '../../../shared/components/StickyTableWrapper'
import { CorteZModal } from '../../pos/components/CorteZModal'

interface CashAuditTabProps {
  data: CashAuditSummary | undefined
  isLoading: boolean
  storeName?: string
}

export function CashAuditTab({ data, isLoading, storeName }: CashAuditTabProps) {
  const [selectedRegisterIdForCorteZ, setSelectedRegisterIdForCorteZ] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-[#CFDBD5] shadow-xs" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-xl border border-[#CFDBD5] shadow-xs" />
      </div>
    )
  }

  const totalSurplus = data?.totalSurplus ?? 0
  const totalDeficit = data?.totalDeficit ?? 0
  const netVariance = data?.netVariance ?? 0
  const accuracyRate = data?.accuracyRate ?? 100
  const totalClosedShifts = data?.totalClosedShifts ?? 0
  const exactShiftsCount = data?.exactShiftsCount ?? 0
  const shifts = data?.shifts ?? []
  const cashiers = data?.cashiers ?? []

  return (
    <div className="space-y-6">
      {/* 1. Tarjetas Superiores de Métricas de Arqueo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sobrantes */}
        <div className="bg-white rounded-xl p-5 border border-[#CFDBD5] shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#242423]/40 transition">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#EFF5EE] rounded-bl-full pointer-events-none group-hover:bg-[#E2EDE1] transition" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                Total Sobrantes (+)
              </span>
              <div className="p-1.5 rounded-lg bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#588157] font-mono tabular-nums tracking-tight">
              +Bs {totalSurplus.toFixed(2)}
            </div>
            <p className="text-xs text-[#5A5D5A] mt-1.5">
              Dinero contado por encima del saldo teórico esperado en gaveta.
            </p>
          </div>
        </div>

        {/* Card 2: Total Faltantes */}
        <div className="bg-white rounded-xl p-5 border border-[#CFDBD5] shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#242423]/40 transition">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#FDF0ED] rounded-bl-full pointer-events-none group-hover:bg-[#F9E2DD] transition" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                Total Faltantes (−)
              </span>
              <div className="p-1.5 rounded-lg bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]">
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#BC4749] font-mono tabular-nums tracking-tight">
              −Bs {totalDeficit.toFixed(2)}
            </div>
            <p className="text-xs text-[#5A5D5A] mt-1.5">
              Diferencias negativas no justificadas al realizar el arqueo ciego.
            </p>
          </div>
        </div>

        {/* Card 3: Balance Neto de Arqueos */}
        <div className="bg-white rounded-xl p-5 border border-[#CFDBD5] shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#242423]/40 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                Balance Neto de Arqueos
              </span>
              <div
                className={`p-1.5 rounded-lg border ${
                  netVariance >= 0
                    ? 'bg-[#EFF5EE] text-[#588157] border-[#BBD2B8]'
                    : 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'
                }`}
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 18h12l3-18H3z" />
                </svg>
              </div>
            </div>
            <div
              className={`text-2xl font-extrabold font-mono tabular-nums tracking-tight ${
                netVariance >= 0 ? 'text-[#588157]' : 'text-[#BC4749]'
              }`}
            >
              {netVariance >= 0 ? '+' : '−'}Bs {Math.abs(netVariance).toFixed(2)}
            </div>
            <p className="text-xs text-[#5A5D5A] mt-1.5">
              {netVariance >= 0
                ? 'Saldo neto acumulado a favor del comercio en el período.'
                : 'Pérdida neta acumulada por descuadres de caja en el período.'}
            </p>
          </div>
        </div>

        {/* Card 4: Tasa de Precisión de Caja */}
        <div className="bg-white rounded-xl p-5 border border-[#CFDBD5] shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#242423]/40 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5A5D5A]">
                Precisión de Cierres
              </span>
              <div className="p-1.5 rounded-lg bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/60">
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#242423] font-mono tabular-nums tracking-tight">
              {accuracyRate}%
            </div>
            <p className="text-xs text-[#5A5D5A] mt-1.5">
              {exactShiftsCount} de {totalClosedShifts} turnos cerraron con arqueo 100% exacto.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Desempeño y Precisión por Cajero */}
      {cashiers.length > 0 && (
        <div className="bg-white rounded-xl border border-[#CFDBD5] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#CFDBD5]">
            <div>
              <h2 className="text-base font-bold text-[#242423] tracking-tight">
                Auditoría y Desempeño por Cajero
              </h2>
              <p className="text-xs text-[#5A5D5A] mt-0.5">
                Consolidado de precisión, sobrantes y faltantes acumulados por cada responsable de caja.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider border-b border-[#CFDBD5]">
                <tr>
                  <th scope="col" className="pb-3 px-3">Cajero</th>
                  <th scope="col" className="pb-3 px-3 text-center">Turnos Operados</th>
                  <th scope="col" className="pb-3 px-3 text-center">Cierres Exactos</th>
                  <th scope="col" className="pb-3 px-3 text-right">Sobrantes (+)</th>
                  <th scope="col" className="pb-3 px-3 text-right">Faltantes (−)</th>
                  <th scope="col" className="pb-3 px-3 text-right">Balance Neto</th>
                  <th scope="col" className="pb-3 px-3 text-right">Precisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFDBD5]/40 text-xs">
                {cashiers.map((c) => (
                  <tr key={c.userId} className="hover:bg-[#E5E5E5]/30 transition">
                    <td className="py-3 px-3 font-semibold text-[#242423]">
                      {c.cashierName}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-[#5A5D5A]">
                      {c.totalShifts}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-[#588157] font-semibold">
                      {c.exactShifts}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#588157]">
                      {c.surplusAmount > 0 ? `+Bs ${c.surplusAmount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#BC4749]">
                      {c.deficitAmount > 0 ? `−Bs ${c.deficitAmount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                      <span
                        className={
                          c.netDifference > 0.009
                            ? 'text-[#588157]'
                            : c.netDifference < -0.009
                            ? 'text-[#BC4749]'
                            : 'text-[#242423]'
                        }
                      >
                        {c.netDifference > 0.009 ? '+' : c.netDifference < -0.009 ? '−' : ''}
                        Bs {Math.abs(c.netDifference).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold border tabular-nums ${
                          c.accuracyRate >= 90
                            ? 'bg-[#EFF5EE] text-[#588157] border-[#BBD2B8]'
                            : c.accuracyRate >= 70
                            ? 'bg-[#FEF9E7] text-[#8A6D14] border-[#F5CB5C]/60'
                            : 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'
                        }`}
                      >
                        {Math.round(c.accuracyRate)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Detalle de Turnos y Arqueos Cerrados en el Período */}
      <div className="bg-white rounded-xl border border-[#CFDBD5] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#CFDBD5]">
          <div>
            <h2 className="text-base font-bold text-[#242423] tracking-tight">
              Historial de Sesiones de Caja Cerradas
            </h2>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              Auditoría individual de cada turno: dinero esperado vs dinero contado en arqueo ciego.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8EDDF] text-[#5A5D5A] border border-[#CFDBD5] tabular-nums self-start sm:self-center">
            {totalClosedShifts} turnos evaluados
          </span>
        </div>

        {shifts.length === 0 ? (
          <div className="py-12 text-center text-[#5A5D5A] bg-[#E8EDDF]/20 rounded-xl border border-dashed border-[#CFDBD5]">
            <svg aria-hidden="true" className="w-10 h-10 mx-auto mb-2 text-[#CFDBD5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-[#242423]">No se encontraron turnos cerrados en este período</p>
            <p className="text-xs text-[#5A5D5A] mt-1">
              Prueba seleccionando un rango de fechas más amplio (ej. Este mes o Últimos 30 días).
            </p>
          </div>
        ) : (
          <StickyTableWrapper>
            <table className="w-full text-left text-sm">
              <thead className="table-sticky-header text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-3">Cierre / Fecha</th>
                  <th scope="col" className="py-3 px-3">Cajero</th>
                  <th scope="col" className="py-3 px-3 text-right">Apertura</th>
                  <th scope="col" className="py-3 px-3 text-right">Ventas Efect.</th>
                  <th scope="col" className="py-3 px-3 text-right">Efectivo Esperado</th>
                  <th scope="col" className="py-3 px-3 text-right">Contado (Arqueo)</th>
                  <th scope="col" className="py-3 px-3 text-center">Diferencia</th>
                  <th scope="col" className="py-3 px-3 text-right">Auditoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFDBD5]/40 text-xs">
                {shifts.map((s) => {
                  const closedDate = s.closedAt
                    ? new Date(s.closedAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                      }) +
                      ' ' +
                      new Date(s.closedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'

                  return (
                    <tr key={s.id} className="hover:bg-[#E5E5E5]/30 transition">
                      <td className="py-3 px-3 font-mono text-[#5A5D5A] whitespace-nowrap">
                        {closedDate}
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#242423]">
                        {s.cashierName}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#5A5D5A]">
                        Bs {s.openingAmount.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#5A5D5A]">
                        +Bs {s.cashSales.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-[#242423]">
                        Bs {s.expectedCash.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-[#242423]">
                        Bs {s.actualClosing.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {s.isExact ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                            Exacto (Bs 0.00)
                          </span>
                        ) : s.isSurplus ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                            +Bs {s.difference.toFixed(2)} (Sobrante)
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]">
                            −Bs {Math.abs(s.difference).toFixed(2)} (Faltante)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedRegisterIdForCorteZ(s.id)}
                          className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#CFDBD5] hover:bg-[#242423] hover:text-white hover:border-[#242423] text-[#242423] text-xs font-semibold rounded-lg transition shadow-2xs active:scale-[0.98] cursor-pointer"
                          title="Ver Corte Z completo e imprimir arqueo"
                        >
                          <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Corte Z</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </StickyTableWrapper>
        )}
      </div>

      {/* Modal oficial Corte Z */}
      {selectedRegisterIdForCorteZ && (
        <CorteZModal
          cashRegisterId={selectedRegisterIdForCorteZ}
          storeName={storeName || 'Comercio'}
          onClose={() => setSelectedRegisterIdForCorteZ(null)}
        />
      )}
    </div>
  )
}
