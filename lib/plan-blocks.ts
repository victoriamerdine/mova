/**
 * Tipos de bloque que el editor de plan sabe crear. Coinciden con
 * `workout_blocks.kind` en el esquema.
 *
 * - INDIVIDUAL: lista de ejercicios sueltos, cada uno con sus series.
 * - COMBINADO / CIRCUITO: las vueltas las define el bloque, no el ejercicio.
 * - El resto ("secciones"): estructuralmente como INDIVIDUAL, pero con un
 *   rótulo temático para organizar el día (calentamiento, movilidad, etc.).
 */
export type SaveDayBlockKind =
  | 'INDIVIDUAL'
  | 'COMBINADO'
  | 'CIRCUITO'
  | 'CALENTAMIENTO'
  | 'ACTIVACION'
  | 'MOVILIDAD'
  | 'RECUPERACION'
  | 'TECNICA'
  | 'TACTICA'

/**
 * Bloques donde la cantidad de vueltas la define el bloque
 * (`workout_blocks.rounds`) y NO cada ejercicio (`workout_prescriptions.sets`).
 * El trigger `workout_prescriptions_enforce_sets_rule` rechaza un `sets`
 * no vacío para estos (Auditoría 4, Problema 9).
 */
export function blockHasRounds(kind: SaveDayBlockKind): boolean {
  return kind === 'COMBINADO' || kind === 'CIRCUITO'
}

/** Etiqueta visible de cada tipo de bloque. */
export const BLOCK_KIND_LABEL: Record<SaveDayBlockKind, string> = {
  INDIVIDUAL: 'Individual',
  COMBINADO: 'Bloque combinado',
  CIRCUITO: 'Bloque circuito',
  CALENTAMIENTO: 'Calentamiento',
  ACTIVACION: 'Activación',
  MOVILIDAD: 'Movilidad',
  RECUPERACION: 'Recuperación',
  TECNICA: 'Técnica',
  TACTICA: 'Táctica',
}

/**
 * Tipos "sección": misma estructura que INDIVIDUAL (lista de ejercicios sin
 * vueltas) pero con un rótulo temático. El profesor los usa para separar
 * calentamiento / activación / movilidad / recuperación / técnica / táctica
 * dentro de un mismo día.
 */
export const SECTION_BLOCK_KINDS = [
  'CALENTAMIENTO',
  'ACTIVACION',
  'MOVILIDAD',
  'RECUPERACION',
  'TECNICA',
  'TACTICA',
] as const satisfies readonly SaveDayBlockKind[]

/** Tipos que el header de un bloque sin vueltas deja elegir con un select. */
export const NON_ROUNDS_BLOCK_KINDS = [
  'INDIVIDUAL',
  ...SECTION_BLOCK_KINDS,
] as const satisfies readonly SaveDayBlockKind[]

const KNOWN_BLOCK_KINDS = new Set<string>(Object.keys(BLOCK_KIND_LABEL))

export function isKnownBlockKind(kind: string): kind is SaveDayBlockKind {
  return KNOWN_BLOCK_KINDS.has(kind)
}
