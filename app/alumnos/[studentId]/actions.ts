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

/**
 * Crea un plan nuevo para el alumno: arranca con 1 semana implícita
 * (MOVA exige el nivel `plan_weeks` en el esquema; acá se colapsa a una
 * sola, invisible en la UI — Focus Entrena no tiene el concepto de
 * "semana", va directo de la rutina a los días) y 2 días en blanco,
 * igual que Focus Entrena.
 */
export async function createPlan(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const studentId = String(formData.get('studentId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const planType = toPlanType(String(formData.get('planType') ?? 'MUSCLE'))
  const sportId = String(formData.get('sportId') ?? '') || null

  if (!studentId || !name) {
    redirect(`/alumnos/${studentId}?error=Falta el nombre del plan`)
  }

  const supabase = await createClient()

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      student_id: studentId,
      professor_id: professor.id,
      name,
      plan_type: planType,
      sport_id: sportId,
      start_date: new Date().toISOString().slice(0, 10),
      status: 'active',
    })
    .select('id')
    .single()

  if (planError || !plan) {
    redirect(`/alumnos/${studentId}?error=${encodeURIComponent(planError?.message ?? 'No se pudo crear el plan')}`)
  }

  const { data: week, error: weekError } = await supabase
    .from('plan_weeks')
    .insert({ plan_id: plan!.id, number: 1 })
    .select('id')
    .single()

  if (weekError || !week) {
    redirect(`/alumnos/${studentId}?error=${encodeURIComponent(weekError?.message ?? 'No se pudo crear la semana')}`)
  }

  const { error: workoutsError } = await supabase.from('workouts').insert([
    { week_id: week!.id, name: 'Día 1', order: 0 },
    { week_id: week!.id, name: 'Día 2', order: 1 },
  ])

  if (workoutsError) {
    redirect(`/alumnos/${studentId}?error=${encodeURIComponent(workoutsError.message)}`)
  }

  redirect(`/planes/${plan!.id}`)
}

export type LoadTargetInput = { groupId: string; weeklySeries: string; intensity: string }

/**
 * Guarda los objetivos de carga por patrón del alumno. Cada fila: si las
 * dos quedan vacías, se borra el objetivo de ese patrón; si tiene alguna,
 * se upsert. El editor de plan los usa para marcar cuando un plan se pasa.
 */
export async function saveLoadTargets(studentId: string, rows: LoadTargetInput[]) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()

  for (const row of rows) {
    const series = row.weeklySeries.trim() === '' ? null : Number.parseInt(row.weeklySeries, 10)
    const intensity = row.intensity.trim() === '' ? null : Number.parseFloat(row.intensity)
    const seriesVal = series != null && Number.isFinite(series) ? series : null
    const intensityVal = intensity != null && Number.isFinite(intensity) ? intensity : null

    if (seriesVal == null && intensityVal == null) {
      await supabase
        .from('student_load_targets')
        .delete()
        .eq('student_id', studentId)
        .eq('group_type', 'pattern')
        .eq('group_id', row.groupId)
    } else {
      const { error } = await supabase.from('student_load_targets').upsert({
        student_id: studentId,
        group_type: 'pattern',
        group_id: row.groupId,
        target_weekly_series: seriesVal,
        target_intensity: intensityVal,
        updated_at: new Date().toISOString(),
      })
      if (error) return { error: error.message }
    }
  }

  revalidatePath(`/alumnos/${studentId}`)
  return { error: null }
}

/** Registra que el alumno pagó — fecha y monto, con nota opcional (ej. "cuota septiembre"). */
export async function registerPayment(
  studentId: string,
  amount: number,
  paidAt: string,
  notes: string,
): Promise<{ error: string | null }> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'El monto tiene que ser mayor a cero.' }
  }
  if (!paidAt) return { error: 'Falta la fecha del pago.' }

  const supabase = await createClient()
  const { error } = await supabase.from('student_payments').insert({
    student_id: studentId,
    professor_id: professor.id,
    amount,
    paid_at: paidAt,
    notes: notes.trim() || null,
  })
  if (error) return { error: error.message }

  revalidatePath(`/alumnos/${studentId}`)
  return { error: null }
}

const COMPETITION_TYPES = [
  'partido',
  'carrera',
  'torneo',
  'campeonato',
  'competencia',
  'test',
  'evento',
  'descanso',
  'recuperacion',
] as const

/**
 * Registra un ítem del calendario del alumno (CLAUDE.md §9/§27): una
 * competencia (partido, carrera, torneo…) con deporte, o un día de
 * descanso/recuperación sin deporte asociado.
 */
export async function createCompetition(
  studentId: string,
  input: {
    sportId: string
    date: string
    type: (typeof COMPETITION_TYPES)[number]
    location: string
    notes: string
  },
): Promise<{ error: string | null }> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  if (!input.date) return { error: 'Falta la fecha.' }
  if (!COMPETITION_TYPES.includes(input.type)) return { error: 'Tipo inválido.' }

  const supabase = await createClient()
  const { error } = await supabase.from('competitions').insert({
    student_id: studentId,
    sport_id: input.sportId || null,
    date: input.date,
    type: input.type,
    location: input.location.trim() || null,
    notes: input.notes.trim() || null,
  })
  if (error) return { error: error.message }

  revalidatePath(`/alumnos/${studentId}`)
  return { error: null }
}

export async function deleteCompetition(studentId: string, competitionId: string) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  await supabase.from('competitions').delete().eq('id', competitionId)

  revalidatePath(`/alumnos/${studentId}`)
}

/**
 * Crea una serie recurrente semanal ("partido todos los domingos") — las
 * ocurrencias concretas se calculan al leer el calendario, no se guardan
 * una por una (ver lib/calendar-recurrence.ts).
 */
export async function createRecurringCompetition(
  studentId: string,
  input: {
    sportId: string
    type: (typeof COMPETITION_TYPES)[number]
    weekday: number
    location: string
    notes: string
    startDate: string
    endDate: string
  },
): Promise<{ error: string | null }> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  if (!input.startDate) return { error: 'Falta la fecha de inicio.' }
  if (!COMPETITION_TYPES.includes(input.type)) return { error: 'Tipo inválido.' }
  if (input.weekday < 0 || input.weekday > 6) return { error: 'Día de la semana inválido.' }
  if (input.endDate && input.endDate < input.startDate) {
    return { error: 'La fecha de fin no puede ser anterior al inicio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('competition_recurrences').insert({
    student_id: studentId,
    sport_id: input.sportId || null,
    type: input.type,
    weekday: input.weekday,
    location: input.location.trim() || null,
    notes: input.notes.trim() || null,
    start_date: input.startDate,
    end_date: input.endDate || null,
  })
  if (error) return { error: error.message }

  revalidatePath(`/alumnos/${studentId}`)
  revalidatePath('/calendario')
  return { error: null }
}

/** Borra la serie recurrente entera (todas sus ocurrencias futuras y pasadas). */
export async function deleteRecurrence(studentId: string, recurrenceId: string) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  await supabase.from('competition_recurrences').delete().eq('id', recurrenceId)

  revalidatePath(`/alumnos/${studentId}`)
  revalidatePath('/calendario')
}

/**
 * Cancela UNA fecha puntual de una serie recurrente ("el día que no
 * juega") sin borrar la serie — inserta una excepción. RLS
 * (is_professor_of vía el join a competition_recurrences) ya garantiza
 * que solo se puede cancelar una fecha de un alumno propio.
 */
export async function cancelRecurrenceOccurrence(recurrenceId: string, date: string) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const supabase = await createClient()
  const { error } = await supabase
    .from('competition_recurrence_exceptions')
    .upsert({ recurrence_id: recurrenceId, date }, { onConflict: 'recurrence_id,date' })

  revalidatePath('/calendario')
  return { error: error?.message ?? null }
}

/**
 * Marca que el profesor ya vio las novedades de este alumno — apaga el
 * aviso en la campanita hasta la próxima sesión completada. Se llama al
 * abrir la ficha del alumno (fire-and-forget, no bloquea el render).
 */
export async function markStudentProgressViewed(studentId: string) {
  const professor = await getCurrentProfessor()
  if (!professor) return

  const supabase = await createClient()
  await supabase
    .from('student_professors')
    .update({ last_progress_viewed_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('professor_id', professor.id)
}
