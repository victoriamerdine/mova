import { describe, expect, it } from 'vitest'

import {
  calculateWeeklyTotals,
  compareProgramadoRealizado,
  mondayOf,
} from '@/lib/analytics/training-load'
import type { VolumeRow } from '@/lib/volume-calc'

describe('calculateWeeklyTotals', () => {
  it('suma series y promedia intensidad de las filas con RPE', () => {
    const rows: VolumeRow[] = [
      { groupId: 'g1', groupName: 'Empuje', series: 10, intensityAvg: 8 },
      { groupId: 'g2', groupName: 'Tracción', series: 6, intensityAvg: 6 },
    ]
    expect(calculateWeeklyTotals(rows)).toEqual({ totalSeries: 16, avgIntensity: 7 })
  })

  it('ignora grupos sin intensidad al promediar, pero los suma en el volumen', () => {
    const rows: VolumeRow[] = [
      { groupId: 'g1', groupName: 'Empuje', series: 10, intensityAvg: null },
      { groupId: 'g2', groupName: 'Tracción', series: 6, intensityAvg: 8 },
    ]
    expect(calculateWeeklyTotals(rows)).toEqual({ totalSeries: 16, avgIntensity: 8 })
  })

  it('semana vacía ⇒ 0 series, sin intensidad', () => {
    expect(calculateWeeklyTotals([])).toEqual({ totalSeries: 0, avgIntensity: null })
  })
})

describe('compareProgramadoRealizado', () => {
  it('empareja por groupId y calcula el % de diferencia', () => {
    const programado: VolumeRow[] = [{ groupId: 'g1', groupName: 'Empuje', series: 10, intensityAvg: null }]
    const realizado: VolumeRow[] = [{ groupId: 'g1', groupName: 'Empuje', series: 12, intensityAvg: null }]
    const [row] = compareProgramadoRealizado(programado, realizado)
    expect(row).toMatchObject({ groupId: 'g1', programado: 10, realizado: 12, diffPct: 20 })
  })

  it('grupo realizado sin programado ⇒ diffPct null (nada contra qué comparar)', () => {
    const realizado: VolumeRow[] = [{ groupId: 'g2', groupName: 'Tracción', series: 5, intensityAvg: null }]
    const [row] = compareProgramadoRealizado([], realizado)
    expect(row).toMatchObject({ groupId: 'g2', programado: 0, realizado: 5, diffPct: null })
  })

  it('grupo programado sin nada realizado ⇒ realizado 0, diffPct -100', () => {
    const programado: VolumeRow[] = [{ groupId: 'g1', groupName: 'Empuje', series: 8, intensityAvg: null }]
    const [row] = compareProgramadoRealizado(programado, [])
    expect(row).toMatchObject({ groupId: 'g1', programado: 8, realizado: 0, diffPct: -100 })
  })
})

describe('mondayOf', () => {
  it('un miércoles retrocede al lunes de esa semana', () => {
    // 2026-09-16 es un miércoles.
    expect(mondayOf(new Date('2026-09-16T12:00:00Z'))).toBe('2026-09-14')
  })

  it('un lunes se queda en el mismo día', () => {
    expect(mondayOf(new Date('2026-09-14T00:00:00Z'))).toBe('2026-09-14')
  })

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(mondayOf(new Date('2026-09-20T23:00:00Z'))).toBe('2026-09-14')
  })
})
