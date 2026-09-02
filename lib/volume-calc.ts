/**
 * Volumen/intensidad por patrón (o músculo) — misma lógica que ya usa
 * Focus Entrena en producción (ver docs/referencia-focus-entrena-actual.md
 * y la spec funcional dada por la usuaria): se agrupa por patrón/músculo,
 * volumen = suma de series, intensidad = promedio de intensidad. Cálculo
 * enteramente en el cliente, sobre datos ya cargados — no pega al backend.
 *
 * Parseo numérico TOLERANTE: "3-4" se lee como 4 (el máximo del rango,
 * el volumen real que se hizo); "al fallo" o vacío no suma nada al
 * volumen pero tampoco rompe el cálculo. Documentado así porque la spec
 * pide explícitamente "parseo numérico tolerante: ignora texto no
 * numérico" sin definir una regla más específica para rangos — se eligió
 * el máximo del rango por ser la lectura más común entre entrenadores
 * (el volumen "cargado" es el de la serie más pesada/exigente).
 */

export function tolerantParseNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const matches = value.match(/\d+(?:[.,]\d+)?/g)
  if (!matches || matches.length === 0) return null
  const numbers = matches.map((m) => parseFloat(m.replace(',', '.')))
  return Math.max(...numbers)
}

export type VolumeRow = { groupId: string; groupName: string; series: number; intensityAvg: number | null }

export type VolumeInput = {
  groupId: string | null
  groupName: string | null
  sets: string | null
  intensityRpe: string | null
}

export function calculateVolumeByGroup(items: VolumeInput[]): VolumeRow[] {
  const byGroup = new Map<string, { name: string; series: number; intensities: number[] }>()

  for (const item of items) {
    if (!item.groupId || !item.groupName) continue
    const series = tolerantParseNumber(item.sets) ?? 0
    const intensity = tolerantParseNumber(item.intensityRpe)

    const existing = byGroup.get(item.groupId) ?? { name: item.groupName, series: 0, intensities: [] }
    existing.series += series
    if (intensity !== null) existing.intensities.push(intensity)
    byGroup.set(item.groupId, existing)
  }

  return Array.from(byGroup.entries()).map(([groupId, { name, series, intensities }]) => ({
    groupId,
    groupName: name,
    series,
    intensityAvg:
      intensities.length > 0
        ? Math.round((intensities.reduce((a, b) => a + b, 0) / intensities.length) * 10) / 10
        : null,
  }))
}
