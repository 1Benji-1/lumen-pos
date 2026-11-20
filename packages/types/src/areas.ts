export const AREA_NAMES = {
  commerce: 'Comercio',
  gastronomy: 'Gastronomía',
  health: 'Salud',
} as const

export type AreaId = keyof typeof AREA_NAMES

export function isAreaId(value: string): value is AreaId {
  return Object.hasOwn(AREA_NAMES, value)
}
