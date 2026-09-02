'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import type { Database } from '@/lib/supabase/database.types'

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
  kind: 'INDIVIDUAL' | 'COMBINADO'
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
        rounds: block.kind === 'COMBINADO' ? block.rounds : null,
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
        // En bloques COMBINADO la cantidad la define block.rounds — el
        // trigger de la base rechaza un `sets` no vacío ahí (Auditoría 4,
        // Problema 9), así que ni se manda.
        sets: block.kind === 'COMBINADO' ? null : item.sets || null,
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
