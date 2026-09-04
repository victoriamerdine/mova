'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import type { Database } from '@/lib/supabase/database.types'
import { blockHasRounds, type SaveDayBlockKind } from '@/lib/plan-blocks'

type PlanType = Database['public']['Tables']['plans']['Row']['plan_type']

const PLAN_TYPES: PlanType[] = ['MUSCLE', 'PATTERN', 'MIXED', 'SPORT_SPECIFIC', 'CUSTOM']

function toPlanType(value: string): PlanType {
  return (PLAN_TYPES as string[]).includes(value) ? (value as PlanType) : 'MUSCLE'
}

export async function updatePlanDetails(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const planId = String(formData.get('planId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const planType = toPlanType(String(formData.get('planType') ?? ''))
  const startDate = String(formData.get('startDate') ?? '') || null
  const endDate = String(formData.get('endDate') ?? '') || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('plans')
    .update({ name, plan_type: planType, start_date: startDate, end_date: endDate })
    .eq('id', planId)

  if (error) {
    redirect(`/planes/${planId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/planes/${planId}`)
}

// ============================================================
// Estructura del plan: semanas y días
// ============================================================

/**
 * Copia el árbol bloques → training_items → prescripciones de un workout
 * a otro (ya creado). No es atómico — misma limitación conocida que
 * `saveDay` (PostgREST no expone transacciones multi-statement). Se
 * resolvería con una función de Postgres (RPC) si llega a hacer falta.
 */
async function copyWorkoutContents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceWorkoutId: string,
  targetWorkoutId: string,
): Promise<{ error: string | null }> {
  const { data: blocksRaw, error: readError } = await supabase
    .from('workout_blocks')
    .select(
      `id, kind, rounds, rest_between_rounds_sec, order,
       training_items(
         id, kind, exercise_id, activity_id, activity_name, label, order,
         workout_prescriptions(sets, reps, load_kg, load_percent, intensity_rpe, rest_label, time_sec, distance_m, pace, tempo, notes, order)
       )`,
    )
    .eq('workout_id', sourceWorkoutId)
    .order('order', { ascending: true })

  if (readError) return { error: `No se pudo leer el día de origen: ${readError.message}` }

  type PrescRow = Record<string, unknown>
  type ItemRow = {
    kind: 'EXERCISE' | 'ACTIVITY'
    exercise_id: string | null
    activity_id: string | null
    activity_name: string | null
    label: string | null
    order: number
    workout_prescriptions: PrescRow[] | PrescRow | null
  }
  type BlockRow = {
    kind: string
    rounds: number | null
    rest_between_rounds_sec: number | null
    order: number
    training_items: ItemRow[]
  }

  for (const block of (blocksRaw ?? []) as unknown as BlockRow[]) {
    const { data: newBlock, error: blockError } = await supabase
      .from('workout_blocks')
      .insert({
        workout_id: targetWorkoutId,
        kind: block.kind as never,
        rounds: block.rounds,
        rest_between_rounds_sec: block.rest_between_rounds_sec,
        order: block.order,
      })
      .select('id')
      .single()

    if (blockError || !newBlock) return { error: `No se pudo copiar un bloque: ${blockError?.message}` }

    for (const item of block.training_items ?? []) {
      const { data: newItem, error: itemError } = await supabase
        .from('training_items')
        .insert({
          block_id: newBlock.id,
          kind: item.kind,
          exercise_id: item.exercise_id,
          activity_id: item.activity_id,
          activity_name: item.activity_name,
          label: item.label,
          order: item.order,
        })
        .select('id')
        .single()

      if (itemError || !newItem) return { error: `No se pudo copiar un ejercicio: ${itemError?.message}` }

      const prescRaw = item.workout_prescriptions
      const presc = Array.isArray(prescRaw) ? prescRaw[0] : prescRaw
      if (presc) {
        const { error: prescError } = await supabase
          .from('workout_prescriptions')
          .insert({ ...presc, training_item_id: newItem.id } as never)
        if (prescError) return { error: `No se pudo copiar una prescripción: ${prescError.message}` }
      }
    }
  }

  return { error: null }
}

export async function addWeek(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const planId = String(formData.get('planId') ?? '')
  const supabase = await createClient()

  const { data: last } = await supabase
    .from('plan_weeks')
    .select('number')
    .eq('plan_id', planId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNumber = (last?.number ?? 0) + 1

  const { data: week, error } = await supabase
    .from('plan_weeks')
    .insert({ plan_id: planId, number: nextNumber })
    .select('id')
    .single()

  if (error || !week) {
    redirect(`/planes/${planId}?error=${encodeURIComponent(error?.message ?? 'No se pudo crear la semana')}`)
  }

  revalidatePath(`/planes/${planId}`)
  redirect(`/planes/${planId}?week=${week!.id}`)
}

export async function duplicateWeek(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const planId = String(formData.get('planId') ?? '')
  const sourceWeekId = String(formData.get('sourceWeekId') ?? '')
  const supabase = await createClient()

  const { data: sourceWeek } = await supabase
    .from('plan_weeks')
    .select('number, name')
    .eq('id', sourceWeekId)
    .maybeSingle()

  const { data: last } = await supabase
    .from('plan_weeks')
    .select('number')
    .eq('plan_id', planId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNumber = (last?.number ?? 0) + 1

  const { data: newWeek, error: weekError } = await supabase
    .from('plan_weeks')
    .insert({
      plan_id: planId,
      number: nextNumber,
      name: sourceWeek?.name ? `${sourceWeek.name} (copia)` : `Semana ${sourceWeek?.number ?? ''} (copia)`.trim(),
    })
    .select('id')
    .single()

  if (weekError || !newWeek) {
    redirect(`/planes/${planId}?error=${encodeURIComponent(weekError?.message ?? 'No se pudo duplicar la semana')}`)
  }

  const { data: sourceWorkouts } = await supabase
    .from('workouts')
    .select('id, name, order, type, objective, estimated_duration_min')
    .eq('week_id', sourceWeekId)
    .order('order', { ascending: true })

  for (const workout of sourceWorkouts ?? []) {
    const { data: newWorkout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        week_id: newWeek!.id,
        name: workout.name,
        order: workout.order,
        type: workout.type,
        objective: workout.objective,
        estimated_duration_min: workout.estimated_duration_min,
      })
      .select('id')
      .single()

    if (workoutError || !newWorkout) {
      redirect(
        `/planes/${planId}?week=${newWeek!.id}&error=${encodeURIComponent(workoutError?.message ?? 'No se pudo copiar un día')}`,
      )
    }

    const { error: copyError } = await copyWorkoutContents(supabase, workout.id, newWorkout!.id)
    if (copyError) {
      redirect(`/planes/${planId}?week=${newWeek!.id}&error=${encodeURIComponent(copyError)}`)
    }
  }

  revalidatePath(`/planes/${planId}`)
  redirect(`/planes/${planId}?week=${newWeek!.id}`)
}

export async function deleteWeek(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const planId = String(formData.get('planId') ?? '')
  const weekId = String(formData.get('weekId') ?? '')
  const supabase = await createClient()

  const { count } = await supabase
    .from('plan_weeks')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId)

  if ((count ?? 0) <= 1) {
    redirect(`/planes/${planId}?error=${encodeURIComponent('El plan necesita al menos una semana.')}`)
  }

  const { error } = await supabase.from('plan_weeks').delete().eq('id', weekId)
  if (error) {
    redirect(`/planes/${planId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/planes/${planId}`)
  redirect(`/planes/${planId}`)
}

export async function addDay(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const planId = String(formData.get('planId') ?? '')
  const weekId = String(formData.get('weekId') ?? '')
  const supabase = await createClient()

  const { count } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('week_id', weekId)

  const nextIndex = count ?? 0

  const { error } = await supabase
    .from('workouts')
    .insert({ week_id: weekId, name: `Día ${nextIndex + 1}`, order: nextIndex })

  if (error) {
    redirect(`/planes/${planId}?week=${weekId}&error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/planes/${planId}`)
  redirect(`/planes/${planId}?week=${weekId}`)
}

export async function renameDay(planId: string, workoutId: string, name: string) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const trimmed = name.trim()
  if (!trimmed) return { error: 'El día necesita un nombre.' }

  const supabase = await createClient()
  const { error } = await supabase.from('workouts').update({ name: trimmed }).eq('id', workoutId)
  if (error) return { error: error.message }

  revalidatePath(`/planes/${planId}`)
  return { error: null }
}

export async function deleteDay(planId: string, workoutId: string) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
  if (error) return { error: error.message }

  revalidatePath(`/planes/${planId}`)
  return { error: null }
}

export async function duplicateDay(planId: string, workoutId: string) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()

  const { data: source, error: sourceError } = await supabase
    .from('workouts')
    .select('week_id, name, order, type, objective, estimated_duration_min')
    .eq('id', workoutId)
    .maybeSingle()

  if (sourceError || !source) return { error: sourceError?.message ?? 'No se encontró el día a duplicar.' }

  // Empuja una posición a todos los días que van después del origen para
  // hacerle lugar a la copia justo detrás.
  const { data: siblings } = await supabase
    .from('workouts')
    .select('id, order')
    .eq('week_id', source.week_id)
    .gt('order', source.order)

  for (const sibling of siblings ?? []) {
    await supabase.from('workouts').update({ order: sibling.order + 1 }).eq('id', sibling.id)
  }

  const { data: newWorkout, error: insertError } = await supabase
    .from('workouts')
    .insert({
      week_id: source.week_id,
      name: `${source.name} (copia)`,
      order: source.order + 1,
      type: source.type,
      objective: source.objective,
      estimated_duration_min: source.estimated_duration_min,
    })
    .select('id')
    .single()

  if (insertError || !newWorkout) return { error: insertError?.message ?? 'No se pudo duplicar el día.' }

  const { error: copyError } = await copyWorkoutContents(supabase, workoutId, newWorkout.id)
  if (copyError) return { error: copyError }

  revalidatePath(`/planes/${planId}`)
  return { error: null }
}

export type SaveDayItemPayload = {
  exerciseId: string | null
  activityName: string | null
  label: string | null
  sets: string
  reps: string
  intensityRpe: string
  restLabel: string
  notes: string
}

export type SaveDayBlockPayload = {
  kind: SaveDayBlockKind
  rounds: number | null
  items: SaveDayItemPayload[]
}

/**
 * Reemplaza TODOS los bloques/ejercicios/prescripciones del día por los
 * nuevos — tal como pide la spec ("Guardar día... reemplaza completamente
 * la lista anterior de ese día").
 *
 * Nota: no es atómico (PostgREST no expone transacciones multi-statement
 * vía REST). Si algo falla a mitad de camino, el día puede quedar
 * parcialmente guardado — aceptado como límite conocido de este MVP, se
 * resolvería con una función de Postgres (RPC) si en la práctica llega a
 * ser un problema real.
 */
export async function saveDay(workoutId: string, planId: string, blocks: SaveDayBlockPayload[]) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()

  const { error: deleteError } = await supabase.from('workout_blocks').delete().eq('workout_id', workoutId)
  if (deleteError) {
    return { error: `No se pudo limpiar el día: ${deleteError.message}` }
  }

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex]
    if (block.items.length === 0) continue

    const { data: insertedBlock, error: blockError } = await supabase
      .from('workout_blocks')
      .insert({
        workout_id: workoutId,
        kind: block.kind,
        rounds: blockHasRounds(block.kind) ? block.rounds : null,
        order: blockIndex,
      })
      .select('id')
      .single()

    if (blockError || !insertedBlock) {
      return { error: `No se pudo guardar un bloque: ${blockError?.message}` }
    }

    for (let itemIndex = 0; itemIndex < block.items.length; itemIndex++) {
      const item = block.items[itemIndex]
      const isExercise = Boolean(item.exerciseId)

      const { data: insertedItem, error: itemError } = await supabase
        .from('training_items')
        .insert({
          block_id: insertedBlock.id,
          kind: isExercise ? 'EXERCISE' : 'ACTIVITY',
          exercise_id: isExercise ? item.exerciseId : null,
          activity_name: isExercise ? null : item.activityName || 'Ejercicio sin nombre',
          label: item.label,
          order: itemIndex,
        })
        .select('id')
        .single()

      if (itemError || !insertedItem) {
        return { error: `No se pudo guardar un ejercicio: ${itemError?.message}` }
      }

      const { error: prescriptionError } = await supabase.from('workout_prescriptions').insert({
        training_item_id: insertedItem.id,
        // En bloques COMBINADO/CIRCUITO la cantidad la define block.rounds —
        // el trigger de la base rechaza un `sets` no vacío ahí (Auditoría 4,
        // Problema 9), así que ni se manda.
        sets: blockHasRounds(block.kind) ? null : item.sets || null,
        reps: item.reps || null,
        intensity_rpe: item.intensityRpe || null,
        rest_label: item.restLabel || null,
        notes: item.notes || null,
        order: itemIndex,
      })

      if (prescriptionError) {
        return { error: `No se pudo guardar la prescripción: ${prescriptionError.message}` }
      }
    }
  }

  revalidatePath(`/planes/${planId}`)
  return { error: null }
}
