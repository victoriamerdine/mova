/**
 * Biblioteca de ejercicios — tipos y helpers compartidos entre el server
 * (queries + actions) y los componentes cliente. Sin dependencias de
 * `next/headers` ni Supabase, así lo puede importar cualquiera.
 */

export type LibraryDifficulty = 'principiante' | 'intermedio' | 'avanzado'

export type LibraryItem = {
  id: string
  /** canonical_name — nombre "de sistema". */
  name: string
  displayName: string
  /** patrón (o, si no hay, tipo de estímulo) — la "categoría" que ya mostraba la card. */
  category: string
  muscle: string
  patternId: string | null
  muscleId: string | null
  difficulty: LibraryDifficulty | null
  description: string | null
  instructions: string | null
  videoId: string | null
  videoUrl: string | null
  status: 'active' | 'pending_review' | 'archived'
  source: 'base_original' | 'nuevo_profe'
  /** Dueño a efectos de aprobación. Null = público. */
  ownerId: string | null
  ownerName: string | null
  /** true si el usuario actual es el dueño. */
  isMine: boolean
  /** true si el match del video quedó marcado para revisar. */
  approxMatch: boolean
}

export type ExerciseFormInput = {
  name: string
  patternId: string | null
  muscleId: string | null
  difficulty: LibraryDifficulty | null
  description: string
  instructions: string
  videoUrl: string
  /** Solo al crear: true = asociar a mi nombre; false = público. */
  owned: boolean
}

/** Solicitud de cambio a un ejercicio con dueño, pendiente de aprobación. */
export type ChangeRequest = {
  id: string
  exerciseId: string
  exerciseName: string
  requestedByName: string
  proposed: Omit<ExerciseFormInput, 'owned'>
  createdAt: string
}

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/(?:shorts\/|watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

/**
 * Normaliza un nombre de ejercicio para comparar duplicados: sin acentos,
 * minúsculas, sin signos, espacios colapsados. "Sentadilla Búlgara (mancuerna)"
 * y "sentadilla bulgara con mancuerna" NO colapsan a lo mismo — eso lo
 * resuelve la comparación por tokens (`nameSimilarity`).
 */
export function normalizeExerciseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOPWORDS = new Set(['de', 'con', 'en', 'el', 'la', 'los', 'las', 'a', 'y', 'para', 'del'])

function tokens(value: string): Set<string> {
  return new Set(
    normalizeExerciseName(value)
      .split(' ')
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  )
}

/**
 * Similitud 0–1 entre dos nombres por solapamiento de tokens (Jaccard).
 * 1 = mismos tokens significativos; se usa un umbral alto para "posible
 * duplicado".
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.6
