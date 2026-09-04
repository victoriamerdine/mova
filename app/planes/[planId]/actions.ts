'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import type { Database } from '@/lib/supabase/database.types'
import type { SaveDayBlockKind } from '@/lib/plan-blocks'

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
//
// Duplicar semana/día usa los RPC `duplicate_plan_week`/`duplicate_workout`
// (supabase/migrations/20260828000016_atomic_day_and_duplication.sql) — cada
// uno corre en una sola transacción de Postgres, así que la copia completa
// (bloques/items/prescripciones incluidos) es atómica: no puede quedar a
// medio copiar como pasaba con los inserts sueltos de antes.
// ============================================================

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
  const newName = sourceWeek?.name ? `${sourceWeek.name} (copia)` : `Semana ${sourceWeek?.number ?? ''} (copia)`.trim()

  const { data: newWeekId, error: weekError } = await supabase.rpc('duplicate_plan_week', {
    p_source_week_id: sourceWeekId,
    p_new_number: nextNumber,
    p_new_name: newName,
  })

  if (weekError || !newWeekId) {
    redirect(`/planes/${planId}?error=${encodeURIComponent(weekError?.message ?? 'No se pudo duplicar la semana')}`)
  }

  revalidatePath(`/planes/${planId}`)
  redirect(`/planes/${planId}?week=${newWeekId}`)
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

  // p_shift_siblings=true: el RPC hace lugar corriendo +1 el order de los
  // días que van después del origen, antes de insertar la copia justo detrás.
  const { error: rpcError } = await supabase.rpc('duplicate_workout', {
    p_source_workout_id: workoutId,
    p_target_week_id: source.week_id,
    p_name: `${source.name} (copia)`,
    p_order: source.order + 1,
    p_shift_siblings: true,
  })

  if (rpcError) return { error: rpcError.message }

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
 * la lista anterior de ese día"). Un solo RPC (`save_workout_day`,
 * supabase/migrations/20260828000016_atomic_day_and_duplication.sql) = una
 * transacción de Postgres: el delete + los inserts son atómicos, no puede
 * quedar el día a medio guardar si algo falla a mitad de camino.
 */
export async function saveDay(workoutId: string, planId: string, blocks: SaveDayBlockPayload[]) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()

  const { error } = await supabase.rpc('save_workout_day', {
    p_workout_id: workoutId,
    p_blocks: blocks,
  })

  if (error) return { error: `No se pudo guardar el día: ${error.message}` }

  revalidatePath(`/planes/${planId}`)
  return { error: null }
}
