export type RecurrenceRule = {
  /** 0 = domingo .. 6 = sábado (Date#getUTCDay()). */
  weekday: number
  /** "YYYY-MM-DD" */
  startDate: string
  /** "YYYY-MM-DD", null = sin fin. */
  endDate: string | null
}

/**
 * Fechas ("YYYY-MM-DD") en que cae una regla semanal dentro de
 * [from, to] (ambos inclusive) — recortado además por la vigencia de la
 * regla (start_date/end_date). No consulta la base: las excepciones
 * (fechas canceladas) se filtran aparte, en la capa de queries.
 */
export function expandWeeklyRecurrence(rule: RecurrenceRule, from: string, to: string): string[] {
  const rangeFrom = rule.startDate > from ? rule.startDate : from
  const rangeTo = rule.endDate && rule.endDate < to ? rule.endDate : to
  if (rangeFrom > rangeTo) return []

  const cursor = new Date(`${rangeFrom}T00:00:00Z`)
  const end = new Date(`${rangeTo}T00:00:00Z`)

  const diff = (rule.weekday - cursor.getUTCDay() + 7) % 7
  cursor.setUTCDate(cursor.getUTCDate() + diff)

  const dates: string[] = []
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return dates
}

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday] ?? '—'
}

export const WEEKDAY_LABELS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** Orden lunes-a-domingo para grillas semanales (los índices siguen siendo 0=domingo..6=sábado). */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** "18:00:00" (columna `time` de Postgres) → "18:00" para mostrar. */
export function fmtTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null
}
