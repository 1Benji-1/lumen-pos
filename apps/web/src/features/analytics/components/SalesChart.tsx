import { useState } from 'react'
import type { DailySalesMetric } from '@lumen-pos/types'

const SPANISH_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const SPANISH_MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]
const SPANISH_DAYS_FULL = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
]
const SPANISH_MONTHS_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function parseDateParts(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return { year, month, day }
}

function formatXAxisLabel(dateStr: string, totalDays: number): string {
  const { year, month, day } = parseDateParts(dateStr)
  if (!year || !month || !day) return dateStr
  const d = new Date(year, month - 1, day)
  const dayName = SPANISH_DAYS_SHORT[d.getDay()]
  const monthName = SPANISH_MONTHS_SHORT[month - 1]

  if (totalDays <= 8) {
    return `${dayName} ${day}`
  } else if (totalDays <= 16) {
    return `${day} ${monthName}`
  } else {
    return `${day}`
  }
}

function formatFullDate(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr)
  if (!year || !month || !day) return dateStr
  const d = new Date(year, month - 1, day)
  const dayName = SPANISH_DAYS_FULL[d.getDay()]
  const monthName = SPANISH_MONTHS_FULL[month - 1]
  return `${dayName}, ${day} de ${monthName} de ${year}`
}

function formatYAxisTick(val: number): string {
  if (val >= 1000000) {
    return `Bs ${(val / 1000000).toFixed(1)}M`
  }
  if (val >= 1000) {
    return `Bs ${(val / 1000).toFixed(1)}k`
  }
  return `Bs ${Math.round(val)}`
}

export function SalesChart({ data }: { data: DailySalesMetric[] }) {
  // Inicializar selección con el día de mayores ventas o el último día
  const defaultDate =
    data.length > 0
      ? [...data].sort((a, b) => b.total_sales - a.total_sales)[0]?.date ??
        data[data.length - 1].date
      : null

  const [selectedDate, setSelectedDate] = useState<string | null>(defaultDate)

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-8 text-center text-[#5A5D5A] text-xs shadow-xs">
        No se registran ventas en el período seleccionado.
      </div>
    )
  }

  const rawMax = Math.max(...data.map((d) => Math.max(d.total_sales, d.gross_profit)), 10)
  // Redondeo superior para líneas guía del eje Y
  const step = Math.pow(10, Math.floor(Math.log10(rawMax))) || 10
  const yMax = Math.ceil((rawMax * 1.15) / (step / 2)) * (step / 2) || 100
  const yMid = Math.round(yMax / 2)

  const chartHeightPx = 180
  const selectedItem = data.find((d) => d.date === selectedDate) ?? data[data.length - 1]

  const selectedMargin =
    selectedItem && selectedItem.total_sales > 0
      ? (selectedItem.gross_profit / selectedItem.total_sales) * 100
      : 0
  const selectedAvgTicket =
    selectedItem && selectedItem.orders_count > 0
      ? selectedItem.total_sales / selectedItem.orders_count
      : 0

  return (
    <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Cabecera del gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-[#242423] uppercase tracking-wider">
              Tendencia de Ventas y Ganancia Real
            </h3>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              Evolución diaria · Toca o haz clic en cualquier barra para inspeccionar el día
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="w-3 h-3 bg-[#F5CB5C] rounded-xs" />
              <span className="text-[#242423] font-medium">Ventas totales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="w-3 h-3 bg-[#588157] rounded-xs" />
              <span className="text-[#242423] font-medium">Ganancia real</span>
            </div>
          </div>
        </div>

        {/* Contenedor del gráfico con Eje Y fijo a la izquierda y barras contenidas */}
        <div className="pt-2 pb-2">
          <div className="flex items-start">
            {/* Columna fija de Eje Y: contenida 100% dentro del recuadro de la tarjeta */}
            <div
              aria-hidden="true"
              className="w-16 shrink-0 flex flex-col justify-between text-right pr-3 select-none pointer-events-none"
              style={{ height: `${chartHeightPx}px` }}
            >
              <span className="text-xs font-mono text-[#5A5D5A] tabular-nums leading-none -translate-y-1/2">
                {formatYAxisTick(yMax)}
              </span>
              <span className="text-xs font-mono text-[#5A5D5A] tabular-nums leading-none -translate-y-1/2">
                {formatYAxisTick(yMid)}
              </span>
              <span className="text-xs font-mono text-[#5A5D5A] tabular-nums leading-none -translate-y-1/2">
                Bs 0
              </span>
            </div>

            {/* Área del gráfico: líneas guía de fondo y barras interactivas con scroll horizontal */}
            <div className="relative flex-1 min-w-0">
              {/* Líneas guía horizontales punteadas */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none flex flex-col justify-between"
                style={{ height: `${chartHeightPx}px` }}
              >
                <div className="border-b border-dashed border-[#CFDBD5] w-full" />
                <div className="border-b border-dashed border-[#CFDBD5] w-full" />
                <div className="border-b border-solid border-[#CFDBD5] w-full" />
              </div>

              {/* Área scrolleable de barras */}
              <div className="overflow-x-auto pb-7 scrollbar-thin">
                <div
                  className="flex items-end gap-1.5 sm:gap-2 px-1 relative"
                  style={{
                    height: `${chartHeightPx}px`,
                    minWidth: `${Math.max(380, data.length * 28)}px`,
                  }}
                >
                  {data.map((item) => {
                    const salesHeight = (item.total_sales / yMax) * chartHeightPx
                    const profitHeight = (Math.max(0, item.gross_profit) / yMax) * chartHeightPx
                    const isSelected = selectedDate === item.date
                    const xLabel = formatXAxisLabel(item.date, data.length)

                    return (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => setSelectedDate(item.date)}
                        aria-label={`Día ${item.date}: Ventas Bs ${item.total_sales.toFixed(2)}, Ganancia Bs ${item.gross_profit.toFixed(2)}`}
                        className={`flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer rounded-t-md p-1 transition ${
                          isSelected
                            ? 'bg-[#F5CB5C]/20 ring-1 ring-[#F5CB5C]'
                            : 'hover:bg-[#E8EDDF]/50'
                        }`}
                      >
                        {/* Indicador de barra seleccionada */}
                        {isSelected && (
                          <span aria-hidden="true" className="absolute -top-2.5 w-2 h-2 rounded-full bg-[#242423]" />
                        )}

                        {/* Barras comparativas */}
                        <div aria-hidden="true" className="w-full max-w-[28px] flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                          {/* Barra Ventas Totales */}
                          <div
                            style={{
                              height: `${Math.max(item.total_sales > 0 ? 4 : 1, salesHeight)}px`,
                            }}
                            className={`w-1/2 rounded-t-xs transition-all ${
                              item.total_sales > 0 ? 'bg-[#F5CB5C]' : 'bg-[#CFDBD5]'
                            } group-hover:brightness-95`}
                          />
                          {/* Barra Ganancia Real */}
                          <div
                            style={{
                              height: `${Math.max(item.gross_profit > 0 ? 4 : 1, profitHeight)}px`,
                            }}
                            className={`w-1/2 rounded-t-xs transition-all ${
                              item.gross_profit > 0 ? 'bg-[#588157]' : 'bg-[#CFDBD5]'
                            } group-hover:brightness-105`}
                          />
                        </div>

                        {/* Etiqueta Eje X en español */}
                        <span
                          className={`absolute -bottom-6 text-xs font-mono tabular-nums whitespace-nowrap ${
                            isSelected ? 'font-bold text-[#242423]' : 'text-[#5A5D5A]'
                          }`}
                        >
                          {xLabel}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de inspección de día seleccionado (óptima para tablets y táctil) */}
      {selectedItem && (
        <div className="mt-5 pt-4 border-t border-[#CFDBD5] bg-[#FAFBF9] rounded-xl p-4 border shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-[#F5CB5C]" />
              <h4 className="text-xs font-bold text-[#242423]">
                {formatFullDate(selectedItem.date)}
              </h4>
            </div>
            <span className="text-xs text-[#5A5D5A] font-medium">
              Detalle diario inspeccionado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white border border-[#CFDBD5] p-2.5 rounded-lg">
              <span className="text-[#5A5D5A] text-xs block">Ventas del día</span>
              <span className="font-bold text-[#242423] text-sm tabular-nums">
                Bs {selectedItem.total_sales.toFixed(2)}
              </span>
            </div>

            <div className="bg-white border border-[#BBD2B8] p-2.5 rounded-lg">
              <span className="text-[#588157] text-xs font-semibold block">Ganancia real</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-[#588157] text-sm tabular-nums">
                  Bs {selectedItem.gross_profit.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-[#588157] bg-[#EFF5EE] px-1.5 py-0.5 rounded border border-[#BBD2B8]">
                  {selectedMargin.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#CFDBD5] p-2.5 rounded-lg">
              <span className="text-[#5A5D5A] text-xs block">Costo mercadería</span>
              <span className="font-medium text-[#242423] text-sm tabular-nums">
                Bs {selectedItem.total_cost.toFixed(2)}
              </span>
            </div>

            <div className="bg-white border border-[#CFDBD5] p-2.5 rounded-lg">
              <span className="text-[#5A5D5A] text-xs block">Transacciones / Ticket</span>
              <span className="font-medium text-[#242423] text-sm tabular-nums">
                {selectedItem.orders_count} vtas · Bs {selectedAvgTicket.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
