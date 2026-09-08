import { describe, expect, it } from 'vitest'

import { calculateVolumeByGroup, tolerantParseNumber } from '@/lib/volume-calc'

describe('tolerantParseNumber', () => {
  it('un número simple', () => {
    expect(tolerantParseNumber('3')).toBe(3)
    expect(tolerantParseNumber('3,5')).toBe(3.5)
  })

  it('un rango se lee como el MÁXIMO (volumen realizado)', () => {
    expect(tolerantParseNumber('3-4')).toBe(4)
    expect(tolerantParseNumber('8 a 12')).toBe(12)
  })

  it('texto no numérico ⇒ null (no rompe el cálculo)', () => {
    expect(tolerantParseNumber('al fallo')).toBeNull()
    expect(tolerantParseNumber('')).toBeNull()
    expect(tolerantParseNumber(null)).toBeNull()
    expect(tolerantParseNumber(undefined)).toBeNull()
  })

  it('número embebido en texto', () => {
    expect(tolerantParseNumber('RPE 8')).toBe(8)
  })
})

describe('calculateVolumeByGroup', () => {
  it('agrupa, suma series y promedia intensidad (1 decimal)', () => {
    const rows = calculateVolumeByGroup([
      { groupId: 'g1', groupName: 'Empuje', sets: '4', intensityRpe: '8' },
      { groupId: 'g1', groupName: 'Empuje', sets: '3', intensityRpe: '7' },
      { groupId: 'g2', groupName: 'Tracción', sets: '4', intensityRpe: '9' },
    ])
    const g1 = rows.find((r) => r.groupId === 'g1')!
    const g2 = rows.find((r) => r.groupId === 'g2')!
    expect(g1.series).toBe(7)
    expect(g1.intensityAvg).toBe(7.5)
    expect(g2.series).toBe(4)
    expect(g2.intensityAvg).toBe(9)
  })

  it('redondea el promedio a 1 decimal', () => {
    const [row] = calculateVolumeByGroup([
      { groupId: 'g', groupName: 'G', sets: '1', intensityRpe: '8' },
      { groupId: 'g', groupName: 'G', sets: '1', intensityRpe: '8' },
      { groupId: 'g', groupName: 'G', sets: '1', intensityRpe: '9' },
    ])
    expect(row.intensityAvg).toBe(8.3) // 25/3 = 8.333…
  })

  it('series no numéricas suman 0 pero no rompen', () => {
    const [row] = calculateVolumeByGroup([
      { groupId: 'g', groupName: 'G', sets: 'al fallo', intensityRpe: null },
      { groupId: 'g', groupName: 'G', sets: '3', intensityRpe: null },
    ])
    expect(row.series).toBe(3)
    expect(row.intensityAvg).toBeNull()
  })

  it('ignora items sin grupo', () => {
    const rows = calculateVolumeByGroup([
      { groupId: null, groupName: null, sets: '5', intensityRpe: '8' },
      { groupId: 'g', groupName: null, sets: '5', intensityRpe: '8' },
    ])
    expect(rows).toHaveLength(0)
  })

  it('rango en series usa el máximo', () => {
    const [row] = calculateVolumeByGroup([
      { groupId: 'g', groupName: 'G', sets: '3-4', intensityRpe: null },
    ])
    expect(row.series).toBe(4)
  })
})
