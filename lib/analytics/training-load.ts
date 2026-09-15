/**
 * Fase 8 — motor de carga sobre datos reales (CLAUDE.md §24/§25). Reutiliza
 * `calculateVolumeByGroup` (lib/volume-calc.ts) sin tocarla: es la misma
 * fórmula que ya usa el editor de plan (volumen = suma de series,
 * intensidad = promedio de RPE), aplicada acá sobre `workout_performance`
 * en vez de sobre el borrador del plan. No se inventa una fórmula nueva.
 */

import { calculateVolumeByGroup, type VolumeInput, type VolumeRow } from '@/lib/volume-calc'

export type { VolumeRow, VolumeInput }

/** Totales de una semana a partir de sus filas de volumen por grupo. */
export function calculateWeeklyTotals(rows: VolumeRow[]): {
  totalSeries: number
  avgIntensity: number | null
} {
  const totalSeries = rows.reduce((n, r) => n + r.series, 0)
  const withIntensity = rows.filter((r) => r.intensityAvg != null)
  const avgIntensity =
    withIntensity.length > 0
      ? Math.round(
          (withIntensity.reduce((n, r) => n + (r.intensityAvg ?? 0), 0) / withIntensity.length) * 10,
        ) / 10
      : null
  return { totalSeries, avgIntensity }
}

export type ComparisonRow = {
  groupId: string
  groupName: string
  programado: number
  realizado: number
  /** null si no había objetivo programado para comparar (0 series programadas). */
  diffPct: number | null
}

/**
 * Programado vs. realizado (CLAUDE.md §24) para una misma agrupación
 * (músculo, patrón o capacidad) — compara series prescritas contra series
 * efectivamente registradas por el alumno en la misma semana.
 */
export function compareProgramadoRealizado(
  programado: VolumeRow[],
  realizado: VolumeRow[],
): ComparisonRow[] {
  const byId = new Map<string, ComparisonRow>()

  for (const p of programado) {
    byId.set(p.groupId, {
      groupId: p.groupId,
      groupName: p.groupName,
      programado: p.series,
      realizado: 0,
      diffPct: null,
    })
  }
  for (const r of realizado) {
    const existing = byId.get(r.groupId)
    if (existing) existing.realizado = r.series
    else byId.set(r.groupId, { groupId: r.groupId, groupName: r.groupName, programado: 0, realizado: r.series, diffPct: null })
  }

  for (const row of byId.values()) {
    row.diffPct = row.programado > 0 ? Math.round(((row.realizado - row.programado) / row.programado) * 1000) / 10 : null
  }

  return [...byId.values()].sort((a, b) => b.programado + b.realizado - (a.programado + a.realizado))
}

/**
 * Semana calendario (lunes) de una fecha, como clave ISO estable para
 * agrupar. Usa los componentes UTC de `date` (no los locales): mismo
 * criterio que el resto de la app para que una sesión no cambie de semana
 * según el huso horario de quien mira el dashboard.
 */
export function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))
  return d.toISOString().slice(0, 10)
}
