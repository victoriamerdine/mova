'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStudent } from '@/lib/supabase/queries/student-plan'
import type { Database } from '@/lib/supabase/database.types'

type Result = { error?: string; sessionId?: string }

async function requireStudent() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')
  return student
}

/** Sesión abierta (sin completar) para este día, o una nueva. */
async function openSessionId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  workoutId: string,
): Promise<string | null> {
  // El día tiene que ser de este alumno (RLS de workouts ya lo garantiza).
  const { data: workout } = await supabase
    .from('workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!workout) return null

  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('workout_id', workoutId)
    .eq('student_id', studentId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created } = await supabase
    .from('workout_sessions')
    .insert({ workout_id: workoutId, student_id: studentId })
    .select('id')
    .single()
  return created?.id ?? null
}

export async function startDaySession(workoutId: string): Promise<Result> {
  const student = await requireStudent()
  const supabase = await createClient()
  const sessionId = await openSessionId(supabase, student.id, workoutId)
  if (!sessionId) return { error: 'No pudimos abrir la sesión.' }
  revalidatePath(`/alumno/dia/${workoutId}`)
  return { sessionId }
}

export async function logExercise(input: {
  workoutId: string
  trainingItemId: string
  setNumber: number
  loadKg: number | null
  reps: string | null
  rpe: number | null
  comments: string | null
}): Promise<Result> {
  const student = await requireStudent()
  const supabase = await createClient()

  const sessionId = await openSessionId(supabase, student.id, input.workoutId)
  if (!sessionId) return { error: 'No pudimos abrir la sesión.' }

  const row: Database['public']['Tables']['workout_performance']['Insert'] = {
    session_id: sessionId,
    training_item_id: input.trainingItemId,
    student_id: student.id,
    set_number: input.setNumber,
    actual_load_kg: input.loadKg,
    actual_reps: input.reps?.trim() || null,
    rpe: input.rpe,
    comments: input.comments?.trim() || null,
    completed_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('workout_performance')
    .upsert(row, { onConflict: 'session_id,training_item_id,set_number' })
  if (error) return { error: error.message }

  revalidatePath(`/alumno/dia/${input.workoutId}`)
  return { sessionId }
}

export async function finishDay(workoutId: string, feelingNote: string): Promise<Result> {
  const student = await requireStudent()
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('workout_id', workoutId)
    .eq('student_id', student.id)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!session) return { error: 'No hay nada registrado en esta sesión.' }

  const { error } = await supabase
    .from('workout_sessions')
    .update({ completed_at: new Date().toISOString(), feeling_note: feelingNote.trim() || null })
    .eq('id', session.id)
  if (error) return { error: error.message }

  revalidatePath('/alumno')
  revalidatePath(`/alumno/dia/${workoutId}`)
  revalidatePath('/alumno/historial')
  return { sessionId: session.id }
}
