/**
 * Señales sobre la distribución de una semana de plan. Son OBSERVACIONES,
 * no juicios (CLAUDE.md §26): "hay más volumen que la semana pasada", no
 * "el plan está mal". El cálculo es determinístico acá; la IA solo las
 * redacta y les da contexto.
 */

export type WeekGroup = { group: string; series: number; intensityAvg: number | null }
export type WeekTarget = { group: string; weeklySeries: number | null; intensity: number | null }
export type WeekAlert = { level: 'info' | 'atencion'; text: string }

const LOW_WEEKLY_SERIES = 10
const HIGH_WEEKLY_SERIES = 130
const TARGET_OVER_RATIO = 1.3
const CONCENTRATION_RATIO = 0.4
const HIGH_INTENSITY = 9

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function weekAlerts(
  weekly: WeekGroup[],
  targets: WeekTarget[],
  sessions: number,
): WeekAlert[] {
  const alerts: WeekAlert[] = []
  const groups = weekly.filter((g) => g.series > 0)
  const total = groups.reduce((n, g) => n + g.series, 0)
  const targetByGroup = new Map(targets.map((t) => [norm(t.group), t]))

  if (total === 0) return alerts

  if (total < LOW_WEEKLY_SERIES) {
    alerts.push({ level: 'info', text: `Volumen semanal bajo: ${total} series en ${sessions} sesión(es).` })
  } else if (total > HIGH_WEEKLY_SERIES) {
    alerts.push({ level: 'atencion', text: `Volumen semanal alto: ${total} series en ${sessions} sesión(es).` })
  }

  for (const g of groups) {
    const share = g.series / total
    if (groups.length > 1 && share >= CONCENTRATION_RATIO) {
      alerts.push({
        level: 'info',
        text: `Concentración en ${g.group}: ${g.series} series (${Math.round(share * 100)}% del volumen).`,
      })
    }
    if (g.intensityAvg != null && g.intensityAvg >= HIGH_INTENSITY && g.series >= 6) {
      alerts.push({
        level: 'atencion',
        text: `Intensidad alta sostenida en ${g.group}: RPE promedio ${g.intensityAvg} sobre ${g.series} series.`,
      })
    }
    const t = targetByGroup.get(norm(g.group))
    if (t?.weeklySeries != null && t.weeklySeries > 0 && g.series > t.weeklySeries * TARGET_OVER_RATIO) {
      alerts.push({
        level: 'atencion',
        text: `${g.group} supera el objetivo de carga: ${g.series} vs objetivo ${t.weeklySeries}.`,
      })
    }
  }

  // Grupos con objetivo pero sin volumen esta semana.
  for (const t of targets) {
    if (t.weeklySeries == null || t.weeklySeries <= 0) continue
    const hit = groups.some((g) => norm(g.group) === norm(t.group))
    if (!hit) {
      alerts.push({
        level: 'info',
        text: `${t.group} sin volumen esta semana (objetivo ${t.weeklySeries} series).`,
      })
    }
  }

  return alerts
}
