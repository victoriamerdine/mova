import { describe, expect, it } from 'vitest'

import { expandWeeklyRecurrence, weekdayLabel } from '@/lib/calendar-recurrence'

describe('calendar-recurrence', () => {
  it('expande todos los domingos dentro del rango pedido', () => {
    // 2026-09-01 es martes; el primer domingo es 2026-09-06.
    const dates = expandWeeklyRecurrence(
      { weekday: 0, startDate: '2026-09-01', endDate: null },
      '2026-09-01',
      '2026-09-30',
    )
    expect(dates).toEqual(['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'])
  })

  it('si el rango pedido empieza justo en el día de la semana, lo incluye', () => {
    // 2026-09-06 es domingo.
    const dates = expandWeeklyRecurrence(
      { weekday: 0, startDate: '2026-09-01', endDate: null },
      '2026-09-06',
      '2026-09-06',
    )
    expect(dates).toEqual(['2026-09-06'])
  })

  it('recorta por start_date de la regla, aunque el rango pedido empiece antes', () => {
    const dates = expandWeeklyRecurrence(
      { weekday: 0, startDate: '2026-09-13', endDate: null },
      '2026-09-01',
      '2026-09-30',
    )
    expect(dates).toEqual(['2026-09-13', '2026-09-20', '2026-09-27'])
  })

  it('recorta por end_date de la regla, aunque el rango pedido siga después', () => {
    const dates = expandWeeklyRecurrence(
      { weekday: 0, startDate: '2026-09-01', endDate: '2026-09-13' },
      '2026-09-01',
      '2026-09-30',
    )
    expect(dates).toEqual(['2026-09-06', '2026-09-13'])
  })

  it('devuelve vacío si la vigencia de la regla no toca el rango pedido', () => {
    const dates = expandWeeklyRecurrence(
      { weekday: 0, startDate: '2026-01-01', endDate: '2026-02-01' },
      '2026-09-01',
      '2026-09-30',
    )
    expect(dates).toEqual([])
  })

  it('devuelve vacío si start_date de la regla es posterior al fin del rango pedido', () => {
    const dates = expandWeeklyRecurrence(
      { weekday: 0, startDate: '2026-12-01', endDate: null },
      '2026-09-01',
      '2026-09-30',
    )
    expect(dates).toEqual([])
  })

  it('funciona para cualquier día de la semana, no solo domingo', () => {
    // Miércoles = 3. 2026-09-02 es miércoles.
    const dates = expandWeeklyRecurrence(
      { weekday: 3, startDate: '2026-09-01', endDate: null },
      '2026-09-01',
      '2026-09-16',
    )
    expect(dates).toEqual(['2026-09-02', '2026-09-09', '2026-09-16'])
  })

  it('weekdayLabel: mapea 0-6 a nombres en español, domingo primero', () => {
    expect(weekdayLabel(0)).toBe('Domingo')
    expect(weekdayLabel(6)).toBe('Sábado')
    expect(weekdayLabel(3)).toBe('Miércoles')
  })

  it('weekdayLabel: valor fuera de rango no rompe', () => {
    expect(weekdayLabel(9)).toBe('—')
  })
})
