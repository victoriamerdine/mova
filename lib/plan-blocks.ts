/**
 * Tipos de bloque que el editor de plan sabe crear hoy. El esquema
 * (`workout_blocks.kind`) admite más (CALENTAMIENTO, MOVILIDAD, etc.),
 * pero la UI del MVP arranca con estos tres.
 */
export type SaveDayBlockKind = 'INDIVIDUAL' | 'COMBINADO' | 'CIRCUITO'

/**
 * Bloques donde la cantidad de vueltas la define el bloque
 * (`workout_blocks.rounds`) y NO cada ejercicio (`workout_prescriptions.sets`).
 * El trigger `workout_prescriptions_enforce_sets_rule` rechaza un `sets`
 * no vacío para estos (Auditoría 4, Problema 9).
 */
export function blockHasRounds(kind: SaveDayBlockKind): boolean {
  return kind === 'COMBINADO' || kind === 'CIRCUITO'
}
