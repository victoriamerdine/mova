/**
 * Badge de renovación — misma regla de negocio que ya usa Focus Entrena
 * en producción (ver docs/referencia-focus-entrena-actual.md): plan
 * mensual fijo, 30 días desde el inicio si no se definió una fecha de fin
 * explícita.
 *
 * Mejora sobre Focus Entrena: `plans.end_date` ya existe en el esquema de
 * MOVA (a diferencia de Focus Entrena, que solo guarda `fechaCreacion` y
 * asume 30 días siempre) — si el profesor la definió, se usa esa fecha
 * real en vez de forzar el default de 30 días.
 */

const DEFAULT_PLAN_DURATION_DAYS = 30

export type RenewalBadge = {
  label: string
  tone: 'critical' | 'warning'
} | null

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((to.getTime() - from.getTime()) / msPerDay)
}

export function getRenewalBadge(
  startDate: string | null,
  endDate: string | null,
  today: Date = new Date(),
): RenewalBadge {
  if (!startDate) return null

  const effectiveEnd = endDate
    ? new Date(endDate)
    : new Date(new Date(startDate).getTime() + DEFAULT_PLAN_DURATION_DAYS * 86_400_000)

  const daysRemaining = daysBetween(today, effectiveEnd)

  if (daysRemaining < 0) {
    return { label: `Vencido hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) === 1 ? '' : 's'}`, tone: 'critical' }
  }
  if (daysRemaining === 0) {
    return { label: 'Renueva hoy', tone: 'warning' }
  }
  if (daysRemaining < 7) {
    return { label: `Renueva en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`, tone: 'warning' }
  }
  return null
}
