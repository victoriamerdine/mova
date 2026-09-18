'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateNewPassword } from '@/lib/auth/password-rules'
import { getCurrentStudent } from '@/lib/supabase/queries/student-plan'
import { isDifficulty } from '@/lib/student-difficulty'
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
  revalidatePath('/alumno')
  revalidatePath(`/alumno/dia/${workoutId}`)
  return { sessionId }
}

export async function logExercise(input: {
  workoutId: string
  trainingItemId: string
  /** Cuántas series terminó haciendo el alumno (todas con la misma carga/reps). */
  seriesCount: number
  loadKg: number | null
  reps: string | null
}): Promise<Result> {
  const student = await requireStudent()
  const supabase = await createClient()

  const sessionId = await openSessionId(supabase, student.id, input.workoutId)
  if (!sessionId) return { error: 'No pudimos abrir la sesión.' }

  const n = Math.min(30, Math.max(1, Math.floor(input.seriesCount) || 1))
  const now = new Date().toISOString()

  // Una fila por serie realizada, todas con la misma carga/reps. Volver a
  // registrar este ejercicio en la sesión reemplaza lo anterior (así bajar
  // de 4 a 3 series borra la 4ª).
  await supabase
    .from('workout_performance')
    .delete()
    .eq('session_id', sessionId)
    .eq('training_item_id', input.trainingItemId)

  const rows: Database['public']['Tables']['workout_performance']['Insert'][] = Array.from(
    { length: n },
    (_, i) => ({
      session_id: sessionId,
      training_item_id: input.trainingItemId,
      student_id: student.id,
      set_number: i + 1,
      actual_load_kg: input.loadKg,
      actual_reps: input.reps?.trim() || null,
      completed_at: now,
    }),
  )

  const { error } = await supabase.from('workout_performance').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/alumno/dia/${input.workoutId}`)
  return { sessionId }
}

export async function finishDay(
  workoutId: string,
  feelingNote: string,
  difficulty: string | null,
): Promise<Result> {
  const student = await requireStudent()
  const supabase = await createClient()

  // Si no hay sesión abierta se crea una ahora: terminar el día sin registrar
  // ningún ejercicio cuenta como "hice todo lo que tocaba".
  const sessionId = await openSessionId(supabase, student.id, workoutId)
  if (!sessionId) return { error: 'No pudimos abrir la sesión.' }

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      completed_at: new Date().toISOString(),
      feeling_note: feelingNote.trim() || null,
      difficulty: isDifficulty(difficulty) ? difficulty : null,
    })
    .eq('id', sessionId)
  if (error) return { error: error.message }

  revalidatePath('/alumno')
  revalidatePath(`/alumno/dia/${workoutId}`)
  revalidatePath('/alumno/calendario')
  return { sessionId }
}

const SCHEDULE_PURPOSES = ['entreno_preferido', 'otra_disciplina'] as const
type SchedulePurpose = (typeof SCHEDULE_PURPOSES)[number]

/**
 * El alumno edita sus propios días de entreno preferido / otra disciplina
 * (CLAUDE.md Fase 9) — excepción deliberada a "el profesor carga el
 * calendario": acá el alumno es la autoridad sobre su disponibilidad. Se
 * reemplaza el conjunto entero para ese propósito (mismo criterio que
 * `logExercise`: volver a guardar borra y reescribe). Marca
 * `students.schedule_updated_at` para la campanita del profesor.
 */
export async function updateMySchedule(
  purpose: SchedulePurpose,
  days: { weekday: number; time: string | null }[],
): Promise<{ error: string | null }> {
  const student = await requireStudent()
  if (!(SCHEDULE_PURPOSES as readonly string[]).includes(purpose)) {
    return { error: 'Propósito inválido.' }
  }

  const supabase = await createClient()
  const { error: delError } = await supabase
    .from('competition_recurrences')
    .delete()
    .eq('student_id', student.id)
    .eq('type', purpose)
  if (delError) return { error: delError.message }

  const today = new Date().toISOString().slice(0, 10)
  const rows = days
    .filter((d) => d.weekday >= 0 && d.weekday <= 6)
    .map((d) => ({
      student_id: student.id,
      type: purpose,
      weekday: d.weekday,
      time: d.time,
      start_date: today,
    }))

  if (rows.length > 0) {
    const { error } = await supabase.from('competition_recurrences').insert(rows)
    if (error) return { error: error.message }
  }

  await supabase
    .from('students')
    .update({ schedule_updated_at: new Date().toISOString() })
    .eq('id', student.id)

  revalidatePath('/alumno/calendario')
  return { error: null }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Solo el alumno individual (autocoacheado) edita sus datos y contraseña
 *  acá: uno gestionado por un profesor no — sus datos los carga el
 *  profesor y su acceso lo maneja él. */
async function requireIndividual() {
  const student = await requireStudent()
  return student.role === 'individual' ? student : null
}

/**
 * El individual edita sus datos personales (nombre, email, teléfono) y su
 * perfil de entrenamiento (los mismos campos que a un alumno le carga el
 * profesor — sin profesor nadie más los puede completar, y alimentan a la
 * IA cuando arma un borrador). Nombre y `students` van por RLS (edita su
 * propia fila); el email cambia al instante vía Auth admin sobre su MISMO
 * id, igual que en /cuenta del profesor.
 */
export async function updateMyIndividualProfile(input: {
  fullName: string
  email: string
  phone: string
  primarySportId: string
  level: string
  availability: string
  equipmentAccess: string
  notes: string
}): Promise<{ error?: string }> {
  const me = await requireIndividual()
  if (!me) return { error: 'Esta opción es solo para cuentas independientes.' }

  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  if (!fullName) return { error: 'El nombre no puede quedar vacío.' }
  if (!EMAIL_RE.test(email)) return { error: 'El email no es válido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (email !== (user?.email?.toLowerCase() ?? null)) {
    const service = createServiceRoleClient()
    const { error: authErr } = await service.auth.admin.updateUserById(me.id, {
      email,
      email_confirm: true,
      user_metadata: { ...(user?.user_metadata ?? {}), email, full_name: fullName },
    })
    if (authErr) return { error: 'Ese email ya está en uso por otra cuenta.' }
  } else {
    await supabase.auth.updateUser({ data: { full_name: fullName } })
  }

  const { error: pErr } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', me.id)
  if (pErr) return { error: pErr.message }

  const { error: sErr } = await supabase
    .from('students')
    .update({
      phone: input.phone.trim() || null,
      primary_sport_id: input.primarySportId || null,
      level: input.level.trim() || null,
      availability: input.availability.trim() || null,
      equipment_access: input.equipmentAccess.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq('id', me.id)
  if (sErr) return { error: sErr.message }

  revalidatePath('/alumno')
  revalidatePath('/alumno/perfil')
  return {}
}

export async function changeMyPassword(newPassword: string): Promise<{ error?: string }> {
  const me = await requireIndividual()
  if (!me) return { error: 'Esta opción es solo para cuentas independientes.' }

  const invalid = validateNewPassword(newPassword)
  if (invalid) return { error: invalid }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return {
      error:
        error.code === 'same_password'
          ? 'Elegí una contraseña distinta a la actual.'
          : error.message,
    }
  }
  return {}
}
