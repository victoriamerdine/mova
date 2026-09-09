import { createClient } from '@/lib/supabase/server'

// ============================================================
// Vista del PROFESOR: qué hizo realmente el alumno y cómo se sintió.
// RLS ya deja al profesor leer workout_sessions / workout_performance
// de sus alumnos (is_professor_of). Solo lectura.
// ============================================================

export type ProgressSet = {
  setNumber: number
  loadKg: number | null
  reps: string | null
  rpe: number | null
  comments: string | null
}

export type ProgressExercise = {
  trainingItemId: string
  name: string
  sets: ProgressSet[]
}

export type ProgressSession = {
  sessionId: string
  workoutName: string
  planName: string
  weekNumber: number | null
  startedAt: string
  completedAt: string
  feelingNote: string | null
  exercises: ProgressExercise[]
}

export async function getStudentProgress(
  studentId: string,
  limit = 30,
): Promise<ProgressSession[]> {
  const supabase = await createClient()

  const { data: sessionsData } = await supabase
    .from('workout_sessions')
    .select(
      'id, started_at, completed_at, feeling_note, workouts(name, plan_weeks(number, plans(name)))',
    )
    .eq('student_id', studentId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit)

  const sessions = (sessionsData ?? []) as unknown as {
    id: string
    started_at: string
    completed_at: string
    feeling_note: string | null
    workouts: {
      name: string
      plan_weeks: { number: number; plans: { name: string } | null } | null
    } | null
  }[]

  if (sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)

  const { data: perfData } = await supabase
    .from('workout_performance')
    .select('session_id, training_item_id, set_number, actual_load_kg, actual_reps, rpe, comments')
    .in('session_id', sessionIds)
    .order('set_number', { ascending: true })

  const perf = (perfData ?? []) as unknown as {
    session_id: string
    training_item_id: string
    set_number: number
    actual_load_kg: number | null
    actual_reps: string | null
    rpe: number | null
    comments: string | null
  }[]

  const itemIds = [...new Set(perf.map((p) => p.training_item_id))]
  const nameByItem = new Map<string, string>()
  if (itemIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('training_items')
      .select('id, activity_name, exercises(canonical_name)')
      .in('id', itemIds)
    for (const it of (itemsData ?? []) as unknown as {
      id: string
      activity_name: string | null
      exercises: { canonical_name: string } | null
    }[]) {
      nameByItem.set(it.id, it.exercises?.canonical_name ?? it.activity_name ?? 'Ejercicio')
    }
  }

  // perf → session → training_item → sets
  const bySession = new Map<string, Map<string, ProgressSet[]>>()
  for (const p of perf) {
    let items = bySession.get(p.session_id)
    if (!items) {
      items = new Map()
      bySession.set(p.session_id, items)
    }
    const sets = items.get(p.training_item_id) ?? []
    sets.push({
      setNumber: p.set_number,
      loadKg: p.actual_load_kg,
      reps: p.actual_reps,
      rpe: p.rpe,
      comments: p.comments,
    })
    items.set(p.training_item_id, sets)
  }

  return sessions.map((s) => {
    const items = bySession.get(s.id) ?? new Map<string, ProgressSet[]>()
    return {
      sessionId: s.id,
      workoutName: s.workouts?.name ?? 'Sesión',
      planName: s.workouts?.plan_weeks?.plans?.name ?? 'Plan',
      weekNumber: s.workouts?.plan_weeks?.number ?? null,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      feelingNote: s.feeling_note,
      exercises: [...items.entries()].map(([trainingItemId, sets]) => ({
        trainingItemId,
        name: nameByItem.get(trainingItemId) ?? 'Ejercicio',
        sets: sets.sort((a, z) => a.setNumber - z.setNumber),
      })),
    }
  })
}
