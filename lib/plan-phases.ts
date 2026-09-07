/**
 * Fases de un plan (`plan_phases`) — nivel opcional entre el plan y las
 * semanas (CLAUDE.md §14: "No todos los planes tienen que utilizar
 * fases"). Sirven para agrupar semanas en bloques: preparación general,
 * específica, competencia, puesta a punto, etc.
 */
export type PlanPhaseKind =
  | 'preparacion_general'
  | 'preparacion_especifica'
  | 'competencia'
  | 'puesta_a_punto'
  | 'transicion'
  | 'recuperacion'
  | 'pretemporada'
  | 'temporada'
  | 'custom'

export const PHASE_KIND_LABEL: Record<PlanPhaseKind, string> = {
  preparacion_general: 'Preparación general',
  preparacion_especifica: 'Preparación específica',
  competencia: 'Competencia',
  puesta_a_punto: 'Puesta a punto',
  transicion: 'Transición',
  recuperacion: 'Recuperación',
  pretemporada: 'Pretemporada',
  temporada: 'Temporada',
  custom: 'Otra',
}

export const PHASE_KIND_OPTIONS = (Object.keys(PHASE_KIND_LABEL) as PlanPhaseKind[]).map((kind) => ({
  value: kind,
  label: PHASE_KIND_LABEL[kind],
}))

export function isPhaseKind(value: string): value is PlanPhaseKind {
  return value in PHASE_KIND_LABEL
}
