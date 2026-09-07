'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { findDuplicateExercises } from '@/lib/supabase/queries/exercises'
import type { ExerciseFormInput, LibraryItem } from '@/lib/library'

type Result = { error?: string; duplicates?: LibraryItem[]; id?: string; archived?: boolean }

function clean(input: ExerciseFormInput) {
  const name = input.name.trim()
  return {
    name,
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
  await supabase
    .from('exercise_media')
    .delete()
    .eq('exercise_id', exerciseId)
    .eq('type', 'video')
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

  // Al renombrar, se conserva el nombre viejo como alias (best-effort).
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
  await syncPrimaryVideo(supabase, id, videoUrl.trim() || null)
  revalidatePath('/biblioteca')
  return { id }
}

export async function deleteExercise(id: string): Promise<Result> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()

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

  // exercise_media / exercise_aliases tienen ON DELETE CASCADE.
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/biblioteca')
  return { id }
}
