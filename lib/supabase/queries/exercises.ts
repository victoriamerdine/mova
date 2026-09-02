import { createClient } from '@/lib/supabase/server'
import type { LibraryExercise } from '@/lib/data/library'

// Forma cruda que devuelve la query (antes de mapear a LibraryExercise,
// la forma que ya esperan los componentes de components/library/*).
type ExerciseRow = {
  id: string
  canonical_name: string
  match_status: string | null
  muscle: { display_name: string } | null
  pattern: { display_name: string } | null
  exercise_stimulus_types: { stimulus_types: { display_name: string } | null }[]
  exercise_media: { url: string; is_primary: boolean; type: string }[]
}

const APPROX_MATCH_STATUSES = new Set(['aproximado_revisar', 'ambiguo'])

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:shorts\/|watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function toLibraryExercise(row: ExerciseRow): LibraryExercise {
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
    category,
    muscle: row.muscle?.display_name ?? 'Sin músculo',
    videoId: primaryVideo ? extractYouTubeId(primaryVideo.url) : null,
    approxMatch: row.match_status ? APPROX_MATCH_STATUSES.has(row.match_status) : false,
  }
}

/**
 * Trae la biblioteca real desde Supabase (reemplaza el array estático de
 * lib/data/library.ts — ver docs/auditoria-01-repositorio-y-arquitectura.md
 * sección D.1 sobre el bug de las dos bibliotecas distintas).
 *
 * Solo `status = 'active'` — pending_review/archived no se muestran acá
 * (ver Auditoría 3 sección N, decisión 12, todavía abierta sobre si
 * pending_review debería ser visible en algún lado).
 */
// Supabase/PostgREST capa cada respuesta a 1.000 filas por default
// (db-max-rows), sin importar si se pide un `.range()` más grande — un
// `.range(0, 9999)` simple igual vuelve truncado a 1.000. Con 1.362
// ejercicios reales eso se notaba de verdad (se vio "1000 de 1000
// ejercicios" en vez de 1.362 al verificar en el navegador). Se pagina en
// bloques de 1.000 hasta que una página vuelve incompleta.
const PAGE_SIZE = 1000

export async function getLibraryExercises(): Promise<LibraryExercise[]> {
  const supabase = await createClient()
  const rows: ExerciseRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('exercises')
      .select(
        `
        id,
        canonical_name,
        match_status,
        muscle:muscles(display_name),
        pattern:patterns(display_name),
        exercise_stimulus_types(stimulus_types(display_name)),
        exercise_media(url, is_primary, type)
      `,
      )
      .eq('status', 'active')
      .order('canonical_name')
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`No se pudo cargar la biblioteca de ejercicios: ${error.message}`)
    }

    const page = data as unknown as ExerciseRow[]
    rows.push(...page)

    if (page.length < PAGE_SIZE) break
  }

  return rows.map(toLibraryExercise)
}
