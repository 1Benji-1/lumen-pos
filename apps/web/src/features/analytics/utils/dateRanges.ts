import type { AnalyticsPeriod } from '@lumen-pos/types'

export interface DateRangeResult {
  startDate: string
  endDate: string
  label: string
}

export function getDateRangeForPeriod(
  period: AnalyticsPeriod,
  customStart?: string,
  customEnd?: string
): DateRangeResult {
  const now = new Date()

  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Hoy',
      }
    }
    case 'yesterday': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Ayer',
      }
    }
    case '7days': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Últimos 7 días',
      }
    }
    case '30days': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Últimos 30 días',
      }
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Este mes',
      }
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Mes anterior',
      }
    }
    case 'custom': {
      const start = customStart ? new Date(customStart + 'T00:00:00') : new Date()
      const end = customEnd ? new Date(customEnd + 'T23:59:59.999') : new Date()
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Rango personalizado',
      }
    }
  }
}
