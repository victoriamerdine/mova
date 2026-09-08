import { describe, expect, it } from 'vitest'

import { weekAlerts } from '@/lib/analytics/week-alerts'

const G = (group: string, series: number, intensityAvg: number | null = null) => ({
  group,
  series,
  intensityAvg,
})

describe('weekAlerts', () => {
  it('sin volumen → sin señales', () => {
    expect(weekAlerts([G('Empuje', 0)], [], 0)).toEqual([])
  })

  it('volumen semanal bajo', () => {
    const a = weekAlerts([G('Empuje', 4), G('Tracción', 3)], [], 2)
    expect(a.some((x) => x.level === 'info' && /bajo/i.test(x.text))).toBe(true)
  })

  it('volumen semanal alto', () => {
    const a = weekAlerts([G('Empuje', 80), G('Tracción', 60)], [], 3)
    expect(a.some((x) => x.level === 'atencion' && /alto/i.test(x.text))).toBe(true)
  })

  it('concentración: un grupo con ≥40% del volumen', () => {
    const a = weekAlerts([G('Empuje', 30), G('Tracción', 20), G('Dom. Rodilla', 10)], [], 3)
    expect(a.some((x) => /Concentración en Empuje/.test(x.text))).toBe(true)
  })

  it('no marca concentración si hay un solo grupo', () => {
    const a = weekAlerts([G('Empuje', 20)], [], 2)
    expect(a.some((x) => /Concentración/.test(x.text))).toBe(false)
  })

  it('intensidad alta sostenida (RPE ≥ 9 y ≥ 6 series)', () => {
    const a = weekAlerts([G('Empuje', 12, 9.4), G('Tracción', 12, 6)], [], 2)
    expect(a.some((x) => x.level === 'atencion' && /Intensidad alta sostenida en Empuje/.test(x.text))).toBe(true)
    expect(a.some((x) => /Tracción/.test(x.text) && /Intensidad/.test(x.text))).toBe(false)
  })

  it('supera el objetivo de carga (>30%)', () => {
    const a = weekAlerts([G('Empuje', 20)], [{ group: 'Empuje', weeklySeries: 12, intensity: null }], 2)
    expect(a.some((x) => x.level === 'atencion' && /supera el objetivo/.test(x.text))).toBe(true)
  })

  it('grupo con objetivo pero sin volumen esta semana', () => {
    const a = weekAlerts(
      [G('Empuje', 12)],
      [
        { group: 'Empuje', weeklySeries: 10, intensity: null },
        { group: 'Dom. Cadera', weeklySeries: 8, intensity: null },
      ],
      2,
    )
    expect(a.some((x) => /Dom\. Cadera sin volumen/.test(x.text))).toBe(true)
  })

  it('el match de objetivo ignora acentos y mayúsculas', () => {
    const a = weekAlerts([G('Traccion', 20)], [{ group: 'Tracción', weeklySeries: 10, intensity: null }], 2)
    expect(a.some((x) => /supera el objetivo/.test(x.text))).toBe(true)
  })
})
