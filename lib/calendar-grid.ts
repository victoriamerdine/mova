/** Celda de un mes en grilla: null en los huecos antes/después del mes. */
export type MonthGridCell = { day: number; dateKey: string } | null

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** "YYYY-MM-DD" a partir de año/mes(0-11)/día — mismo formato que `date` de Postgres. */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

/**
 * Semanas (lunes primero) de un mes, con celdas null en los huecos antes
 * del día 1 y después del último día — siempre múltiplo de 7.
 */
export function buildMonthGrid(year: number, month: number): MonthGridCell[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7 // lunes = 0

  const cells: MonthGridCell[] = [
    ...Array.from({ length: firstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, dateKey: dateKey(year, month, i + 1) })),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: MonthGridCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Suma (o resta) meses a un {year, month}, con acarreo de año. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

/** "Septiembre 2026" (mayúscula inicial), para el título del mes. */
export function monthTitle(year: number, month: number): string {
  const s = new Date(year, month, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
