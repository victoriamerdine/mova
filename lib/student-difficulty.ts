// Valoración cualitativa que el alumno le pone a la sesión del día
// (reemplaza el RPE 1-10 por serie).

export const DIFFICULTY_OPTIONS = ['facil', 'moderado', 'dificil'] as const

export type SessionDifficulty = (typeof DIFFICULTY_OPTIONS)[number]

export const DIFFICULTY_LABEL: Record<SessionDifficulty, string> = {
  facil: 'Fácil',
  moderado: 'Moderado',
  dificil: 'Difícil',
}

export function isDifficulty(v: unknown): v is SessionDifficulty {
  return typeof v === 'string' && (DIFFICULTY_OPTIONS as readonly string[]).includes(v)
}
