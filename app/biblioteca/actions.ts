'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { findDuplicateExercises } from '@/lib/supabase/queries/exercises'
import type { ExerciseFormInput, LibraryItem } from '@/lib/library'

type Result = {
  error?: string
  duplicates?: LibraryItem[]
  id?: string
  archived?: boolean
  /** El cambio quedó pendiente de aprobación del dueño. */
  pendingReview?: boolean
  ownerName?: string
}

function clean(input: ExerciseFormInput) {
  return {
    name: input.name.trim(),
    patternId: input.patternId || null,
    muscleId: input.muscleId || null,
    difficulty: input.difficulty ?? null,
    description: input.description.trim() || null,
    instructions: input.instructions.trim() || null,
    videoUrl: input.videoUrl.trim() || null,
  }
}

/** Reemplaza el video principal del ejercicio por `url` (o lo saca si es null). */
async function syncPrimaryVideo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exerciseId: string,
  url: string | null,
) {
  await supabase.from('exercise_media').delete().eq('exercise_id', exerciseId).eq('type', 'video')
  if (url) {
    await supabase.from('exercise_media').insert({
      exercise_id: exerciseId,
      type: 'video',
      url,
      source: 'youtube',
      is_primary: true,
    })
  }
}

type OwnerCheck = { ownerId: string | null; ownerName: string | null; canManageDirect: boolean }

/** Dueño del ejercicio + si el profesor actual puede editarlo directo (propio o público). */
async function checkOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exerciseId: string,
  professorId: string,
): Promise<OwnerCheck> {
  const { data } = await supabase
    .from('exercises')
    .select('owner_id, owner:professors!exercises_owner_id_fkey(profiles(full_name))')
    .eq('id', exerciseId)
    .maybeSingle()

  const ownerId = (data as { owner_id: string | null } | null)?.owner_id ?? null
  const ownerName =
    (data as unknown as { owner: { profiles: { full_name: string } | null } | null } | null)?.owner
      ?.profiles?.full_name ?? null

  return { ownerId, ownerName, canManageDirect: ownerId == null || ownerId === professorId }
}

export async function createExercise(
  input: ExerciseFormInput,
  opts?: { force?: boolean },
): Promise<Result> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const data = clean(input)
  if (!data.name) return { error: 'El ejercicio necesita un nombre.' }

  if (!opts?.force) {
    const duplicates = await findDuplicateExercises(data.name)
    if (duplicates.length > 0) return { duplicates }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('exercises')
    .insert({
      canonical_name: data.name,
      display_name: data.name,
      original_name: data.name,
      description: data.description,
      instructions: data.instructions,
      difficulty: data.difficulty,
      pattern_id: data.patternId,
      muscle_id: data.muscleId,
      source: 'nuevo_profe',
      status: 'active',
      added_by: professor.id,
      owner_id: input.owned ? professor.id : null,
    })
    .select('id')
    .single()

  if (error || !row) return { error: error?.message ?? 'No se pudo crear el ejercicio.' }

  if (data.videoUrl) await syncPrimaryVideo(supabase, row.id, data.videoUrl)

  revalidatePath('/biblioteca')
  return { id: row.id }
}

export async function updateExercise(id: string, input: ExerciseFormInput): Promise<Result> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const data = clean(input)
  if (!data.name) return { error: 'El ejercicio necesita un nombre.' }

  const supabase = await createClient()
  const owner = await checkOwner(supabase, id, professor.id)

  // Ejercicio de otro dueño → el cambio va a revisión, no se aplica.
  if (!owner.canManageDirect) {
    const proposed = {
      name: data.name,
      patternId: data.patternId,
      muscleId: data.muscleId,
      difficulty: data.difficulty,
      description: input.description.trim(),
      instructions: input.instructions.trim(),
      videoUrl: data.videoUrl ?? '',
    }
    const { error } = await supabase
      .from('exercise_change_requests')
      .insert({ exercise_id: id, requested_by: professor.id, proposed, status: 'pending' })
    if (error) return { error: error.message }
    revalidatePath('/biblioteca')
    return { id, pendingReview: true, ownerName: owner.ownerName ?? undefined }
  }

  const { data: current } = await supabase
    .from('exercises')
    .select('canonical_name')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('exercises')
    .update({
      canonical_name: data.name,
      display_name: data.name,
      description: data.description,
      instructions: data.instructions,
      difficulty: data.difficulty,
      pattern_id: data.patternId,
      muscle_id: data.muscleId,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  if (current?.canonical_name && current.canonical_name.trim() !== data.name) {
    await supabase
      .from('exercise_aliases')
      .insert({ exercise_id: id, alias: current.canonical_name, note: 'nombre anterior' })
  }

  await syncPrimaryVideo(supabase, id, data.videoUrl)

  revalidatePath('/biblioteca')
  return { id }
}

export async function replaceExerciseVideo(id: string, videoUrl: string): Promise<Result> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  const owner = await checkOwner(supabase, id, professor.id)
  if (!owner.canManageDirect) {
    return {
      error: `Este ejercicio es de ${owner.ownerName ?? 'otro profesor'}. Editalo desde "Editar" para enviar el cambio a su aprobación.`,
    }
  }

  await syncPrimaryVideo(supabase, id, videoUrl.trim() || null)
  revalidatePath('/biblioteca')
  return { id }
}

export async function deleteExercise(id: string): Promise<Result> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  const owner = await checkOwner(supabase, id, professor.id)
  if (!owner.canManageDirect) {
    return { error: `Este ejercicio es de ${owner.ownerName ?? 'otro profesor'} — no lo podés eliminar.` }
  }

  const { count } = await supabase
    .from('training_items')
    .select('id', { count: 'exact', head: true })
    .eq('exercise_id', id)

  if ((count ?? 0) > 0) {
    const { error } = await supabase.from('exercises').update({ status: 'archived' }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/biblioteca')
    return { id, archived: true }
  }

  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/biblioteca')
  return { id }
}

// ============================================================
// Aprobación de cambios (el dueño resuelve).
// ============================================================
export async function approveChangeRequest(requestId: string): Promise<Result> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  const { error } = await supabase.rpc('apply_exercise_change_request', { p_request_id: requestId })
  if (error) return { error: error.message }
  revalidatePath('/biblioteca')
  return {}
}

export async function rejectChangeRequest(requestId: string): Promise<Result> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  const { error } = await supabase
    .from('exercise_change_requests')
    .update({ status: 'rejected', reviewed_by: professor.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) return { error: error.message }
  revalidatePath('/biblioteca')
  return {}
}
