import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import {
  DUPLICATE_SIMILARITY_THRESHOLD,
  extractYouTubeId,
  nameSimilarity,
  normalizeExerciseName,
  type ChangeRequest,
  type LibraryItem,
} from '@/lib/library'

const APPROX_MATCH_STATUSES = new Set(['aproximado_revisar', 'ambiguo'])

// Forma cruda que devuelve la query.
type ExerciseRow = {
  id: string
  canonical_name: string
  display_name: string
  description: string | null
  instructions: string | null
  difficulty: LibraryItem['difficulty']
  status: LibraryItem['status']
  source: LibraryItem['source']
  match_status: string | null
  muscle_id: string | null
  pattern_id: string | null
  owner_id: string | null
  muscle: { display_name: string } | null
  pattern: { display_name: string } | null
  exercise_stimulus_types: { stimulus_types: { display_name: string } | null }[]
  exercise_media: { url: string; is_primary: boolean; type: string }[]
}

// El nombre del dueño se resuelve aparte (no con embed de PostgREST):
// exercises tiene 4 FKs a professors y el embed es frágil.
const SELECT = `
  id,
  canonical_name,
  display_name,
  description,
  instructions,
  difficulty,
  status,
  source,
  match_status,
  muscle_id,
  pattern_id,
  owner_id,
  muscle:muscles(display_name),
  pattern:patterns(display_name),
  exercise_stimulus_types(stimulus_types(display_name)),
  exercise_media(url, is_primary, type)
`

async function resolveOwnerNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerIds: (string | null)[],
): Promise<Map<string, string>> {
  const ids = [...new Set(ownerIds.filter((x): x is string => !!x))]
  if (ids.length === 0) return new Map()
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  return new Map((data ?? []).map((p) => [p.id, p.full_name]))
}

function toLibraryItem(
  row: ExerciseRow,
  currentProfessorId: string | null,
  ownerNames: Map<string, string>,
): LibraryItem {
  const category =
    row.pattern?.display_name ??
    row.exercise_stimulus_types.find((r) => r.stimulus_types)?.stimulus_types?.display_name ??
    'Sin categoría'

  const primaryVideo =
    row.exercise_media.find((m) => m.type === 'video' && m.is_primary) ??
    row.exercise_media.find((m) => m.type === 'video') ??
    null

  return {
    id: row.id,
    name: row.canonical_name,
    displayName: row.display_name,
    category,
    muscle: row.muscle?.display_name ?? 'Sin músculo',
    patternId: row.pattern_id,
    muscleId: row.muscle_id,
    difficulty: row.difficulty,
    description: row.description,
    instructions: row.instructions,
    videoId: primaryVideo ? extractYouTubeId(primaryVideo.url) : null,
    videoUrl: primaryVideo?.url ?? null,
    status: row.status,
    source: row.source,
    ownerId: row.owner_id,
    ownerName: row.owner_id ? (ownerNames.get(row.owner_id) ?? null) : null,
    isMine: row.owner_id != null && row.owner_id === currentProfessorId,
    approxMatch: row.match_status ? APPROX_MATCH_STATUSES.has(row.match_status) : false,
  }
}

// PostgREST capa cada respuesta a 1.000 filas (db-max-rows) aunque se pida
// un `.range()` mayor — con ~1.362 ejercicios reales hay que paginar.
const PAGE_SIZE = 1000

/** Biblioteca completa (solo `active`) para la pantalla de gestión. */
export async function getLibraryItems(): Promise<LibraryItem[]> {
  const supabase = await createClient()
  const professor = await getCurrentProfessor()
  const rows: ExerciseRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('exercises')
      .select(SELECT)
      .eq('status', 'active')
      .order('canonical_name')
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`No se pudo cargar la biblioteca: ${error.message}`)
    const page = data as unknown as ExerciseRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  const ownerNames = await resolveOwnerNames(
    supabase,
    rows.map((r) => r.owner_id),
  )
  return rows.map((r) => toLibraryItem(r, professor?.id ?? null, ownerNames))
}

/** Solicitudes de cambio pendientes sobre ejercicios de los que soy dueño. */
export async function getPendingChangeRequestsForOwner(): Promise<ChangeRequest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercise_change_requests')
    .select('id, exercise_id, proposed, created_at, requested_by, exercises(canonical_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const rows = data as unknown as {
    id: string
    exercise_id: string
    proposed: ChangeRequest['proposed']
    created_at: string
    requested_by: string
    exercises: { canonical_name: string } | null
  }[]

  const requesterNames = await resolveOwnerNames(
    supabase,
    rows.map((r) => r.requested_by),
  )

  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    exerciseName: r.exercises?.canonical_name ?? 'Ejercicio',
    requestedByName: requesterNames.get(r.requested_by) ?? 'Otro profesor',
    proposed: r.proposed,
    createdAt: r.created_at,
  }))
}

/** Compat: firma vieja usada por algún import previo. */
export const getLibraryExercises = getLibraryItems

export type LibraryCatalog = {
  patterns: { id: string; name: string }[]
  muscles: { id: string; name: string }[]
}

export async function getLibraryCatalog(): Promise<LibraryCatalog> {
  const supabase = await createClient()
  const [{ data: patterns }, { data: muscles }] = await Promise.all([
    supabase.from('patterns').select('id, display_name').order('sort_order'),
    supabase.from('muscles').select('id, display_name').order('sort_order'),
  ])
  return {
    patterns: (patterns ?? []).map((p) => ({ id: p.id, name: p.display_name })),
    muscles: (muscles ?? []).map((m) => ({ id: m.id, name: m.display_name })),
  }
}

/**
 * Ejercicios que parecen duplicados de `name`: match exacto normalizado o
 * similitud de tokens por encima del umbral. `excludeId` para no
 * matchearse a sí mismo al editar.
 */
export async function findDuplicateExercises(
  name: string,
  excludeId?: string,
): Promise<LibraryItem[]> {
  const norm = normalizeExerciseName(name)
  if (!norm) return []

  const supabase = await createClient()
  const professor = await getCurrentProfessor()
  const rows: ExerciseRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('exercises')
      .select(SELECT)
      .eq('status', 'active')
      .order('canonical_name')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`No se pudo revisar duplicados: ${error.message}`)
    const page = data as unknown as ExerciseRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  const ownerNames = await resolveOwnerNames(
    supabase,
    rows.map((r) => r.owner_id),
  )

  return rows
    .filter((r) => r.id !== excludeId)
    .map((r) => ({
      item: toLibraryItem(r, professor?.id ?? null, ownerNames),
      sim: nameSimilarity(name, r.canonical_name),
    }))
    .filter(
      ({ item, sim }) =>
        normalizeExerciseName(item.name) === norm || sim >= DUPLICATE_SIMILARITY_THRESHOLD,
    )
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 8)
    .map(({ item }) => item)
}
