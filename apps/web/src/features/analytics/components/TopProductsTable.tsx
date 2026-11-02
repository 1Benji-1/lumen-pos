import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StickyTableWrapper } from '../../../shared/components/StickyTableWrapper'
import type { TopProductMetric } from '@lumen-pos/types'

type SortField = 'revenue' | 'quantity' | 'profit' | 'margin' | 'stock'

export function TopProductsTable({ data }: { data: TopProductMetric[] }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('revenue')

  const filtered = data.filter(
    (item) =>
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.variant_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category_name && item.category_name.toLowerCase().includes(search.toLowerCase()))
  )

  const sorted = [...filtered].sort((a, b) => {
    switch (sortField) {
      case 'revenue':
        return b.revenue - a.revenue
      case 'quantity':
        return b.quantity_sold - a.quantity_sold
      case 'profit':
        return b.gross_profit - a.gross_profit
      case 'margin':
        return b.profit_margin - a.profit_margin
      case 'stock':
        return (a.current_stock ?? 0) - (b.current_stock ?? 0)
    }
  })

  function handleExportCsv() {
    const headers = [
      'Posición',
      'Producto',
      'Variante',
      'Categoría',
      'Stock actual',
      'Unidades vendidas',
      'Facturación (Bs)',
      'Costo total (Bs)',
      'Ganancia bruta (Bs)',
      'Margen (%)',
    ]

    const rows = sorted.map((item, idx) => [
      idx + 1,
      `"${item.product_name.replace(/"/g, '""')}"`,
      `"${item.variant_name.replace(/"/g, '""')}"`,
      `"${(item.category_name ?? '').replace(/"/g, '""')}"`,
      item.current_stock !== undefined ? item.current_stock : '',
      item.quantity_sold,
      item.revenue.toFixed(2),
      item.cost.toFixed(2),
      item.gross_profit.toFixed(2),
      `${item.profit_margin.toFixed(2)}%`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `productos_mas_vendidos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white border border-[#CFDBD5] rounded-xl p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-[#242423] uppercase tracking-wider">
            Productos Más Vendidos y Margen Real
          </h3>
          <p className="text-xs text-[#5A5D5A] mt-0.5">
            Rendimiento comercial con costo unitario, rentabilidad y stock actual para reposición
          </p>
        </div>

        {/* Controles de búsqueda, ordenamiento y exportación con altura táctil mínima de 44px */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar producto o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[44px] bg-[#E8EDDF]/40 border border-[#CFDBD5] text-[#242423] rounded-lg px-3.5 py-2 text-xs placeholder:text-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white w-56 transition"
            aria-label="Buscar producto en tabla"
          />

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="min-h-[44px] bg-[#E8EDDF]/40 border border-[#CFDBD5] text-[#242423] rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-[#242423] focus:bg-white transition cursor-pointer"
            aria-label="Criterio de ordenamiento"
          >
            <option value="revenue">Mayor facturación</option>
            <option value="quantity">Mayor cantidad vendida</option>
            <option value="profit">Mayor ganancia real</option>
            <option value="margin">Mayor margen (%)</option>
            <option value="stock">Menor stock (reposición)</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sorted.length === 0}
            className="min-h-[44px] px-4 py-2 bg-white hover:bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] rounded-lg text-xs font-semibold transition shadow-2xs disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <svg aria-hidden="true" className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-[#5A5D5A] text-xs text-center py-8">
          No se encontraron productos para el criterio seleccionado.
        </p>
      ) : (
        /* Envoltura con StickyTableWrapper para mantener visible la cabecera durante el scroll */
        <StickyTableWrapper className="mt-2" maxHeight="max-h-[520px]">
          <table className="w-full text-left text-xs text-[#242423]">
            <thead className="table-sticky-header text-xs uppercase tracking-wider text-[#5A5D5A]">
              <tr>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423]">#</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423]">Producto</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423]">Categoría</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423]">Stock Actual</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423] text-right">Unidades</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423] text-right">Facturación</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423] text-right">Costo</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423] text-right">Ganancia real</th>
                <th scope="col" className="py-3 px-3 font-semibold text-[#242423] text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]">
              {sorted.map((p, idx) => {
                const marginClass =
                  p.profit_margin >= 40
                    ? 'bg-[#EFF5EE] text-[#588157] border-[#BBD2B8]'
                    : p.profit_margin >= 20
                    ? 'bg-[#FEF9E7] text-[#8A6D14] border-[#F5CB5C]/50'
                    : p.profit_margin >= 0
                    ? 'bg-[#E8EDDF] text-[#5A5D5A] border-[#CFDBD5]'
                    : 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'

                const stock = p.current_stock
                const lowThreshold = p.low_stock_threshold ?? 5
                const isOutOfStock = stock !== undefined && stock <= 0
                const isLowStock = stock !== undefined && stock > 0 && stock <= lowThreshold

                return (
                  <tr key={`${p.product_id}-${p.variant_name}`} className="hover:bg-[#E8EDDF]/20 transition">
                    <td className="py-2.5 px-3 text-[#5A5D5A] font-mono tabular-nums">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-[#242423]">
                      <div className="font-semibold text-[#242423]">{p.product_name}</div>
                      {p.variant_name !== 'Único' && (
                        <span className="text-[#5A5D5A] text-xs">
                          Variante: {p.variant_name}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#5A5D5A]">{p.category_name ?? '—'}</td>

                    {/* Columna de Stock Actual con alertas de reposición */}
                    <td className="py-2.5 px-3">
                      {stock === undefined ? (
                        <span className="text-[#5A5D5A] text-xs">—</span>
                      ) : isOutOfStock ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4] tabular-nums">
                            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#BC4749]" />
                            Agotado (0)
                          </span>
                          <Link
                            to={`/inventory?search=${encodeURIComponent(p.product_name)}`}
                            className="min-h-[32px] sm:min-h-[36px] text-xs text-[#BC4749] underline hover:text-[#9A383A] font-semibold inline-flex items-center gap-1"
                            title={`Reponer ${p.product_name} en Inventario`}
                          >
                            Reponer stock &rarr;
                          </Link>
                        </div>
                      ) : isLowStock ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/60 tabular-nums">
                            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#8A6D14]" />
                            Bajo: {stock} unid.
                          </span>
                          <Link
                            to={`/inventory?search=${encodeURIComponent(p.product_name)}`}
                            className="min-h-[32px] sm:min-h-[36px] text-xs text-[#8A6D14] underline hover:text-[#242423] font-medium inline-flex items-center gap-1"
                            title={`Reponer ${p.product_name} en Inventario`}
                          >
                            Reponer &rarr;
                          </Link>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8] tabular-nums">
                          {stock} unid.
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-semibold text-[#242423] tabular-nums">
                      {p.quantity_sold}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#242423] tabular-nums">
                      Bs {p.revenue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#5A5D5A] tabular-nums">
                      Bs {p.cost.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#588157] tabular-nums">
                      Bs {p.gross_profit.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${marginClass}`}
                      >
                        {p.profit_margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}
    </div>
  )
}
