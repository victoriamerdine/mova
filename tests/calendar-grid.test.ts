import { describe, expect, it } from 'vitest'

import { addMonths, buildMonthGrid, dateKey, localDateKey, monthTitle } from '@/lib/calendar-grid'

describe('calendar-grid', () => {
  it('dateKey: rellena con ceros mes y día', () => {
    expect(dateKey(2026, 0, 5)).toBe('2026-01-05')
    expect(dateKey(2026, 11, 31)).toBe('2026-12-31')
  })

  it('buildMonthGrid: todas las semanas tienen 7 celdas', () => {
    const weeks = buildMonthGrid(2026, 8) // septiembre 2026
    for (const week of weeks) expect(week).toHaveLength(7)
  })

  it('buildMonthGrid: contiene todos los días del mes, en orden, sin duplicados', () => {
    const weeks = buildMonthGrid(2026, 8) // septiembre tiene 30 días
    const days = weeks.flat().filter((c): c is { day: number; dateKey: string } => c != null)
    expect(days.map((d) => d.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
  })

  it('buildMonthGrid: el 1° de septiembre 2026 (martes) tiene 1 hueco antes (lunes)', () => {
    const weeks = buildMonthGrid(2026, 8)
    expect(weeks[0][0]).toBeNull()
    expect(weeks[0][1]?.day).toBe(1)
  })

  it('buildMonthGrid: dateKey de cada celda coincide con su año/mes/día', () => {
    const weeks = buildMonthGrid(2026, 0) // enero
    const first = weeks.flat().find((c) => c != null)
    expect(first?.dateKey).toBe('2026-01-01')
  })

  it('addMonths: suma dentro del mismo año', () => {
    expect(addMonths(2026, 5, 2)).toEqual({ year: 2026, month: 7 })
  })

  it('addMonths: acarrea el año hacia adelante', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })

  it('addMonths: acarrea el año hacia atrás', () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })

  it('addMonths: delta 0 es identidad', () => {
    expect(addMonths(2026, 3, 0)).toEqual({ year: 2026, month: 3 })
  })

  it('monthTitle: capitaliza el nombre del mes en español', () => {
    expect(monthTitle(2026, 0)).toMatch(/^Enero de 2026$/)
  })

  it('localDateKey: usa el mismo día/mes/año que los getters LOCALES del Date (no UTC) — a propósito, para agrupar sesiones por el día del alumno, no el del server', () => {
    const iso = '2026-09-16T15:30:00.000Z'
    const d = new Date(iso)
    const expected = dateKey(d.getFullYear(), d.getMonth(), d.getDate())
    expect(localDateKey(iso)).toBe(expected)
  })

  it('localDateKey: formatea con ceros a la izquierda', () => {
    expect(localDateKey('2026-01-05T12:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
