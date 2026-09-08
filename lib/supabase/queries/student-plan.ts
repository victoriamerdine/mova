import { createClient } from '@/lib/supabase/server'

export type CurrentStudent = { id: string; fullName: string }

/** null si no hay sesión o el usuario logueado no es alumno. */
export async function getCurrentStudent(): Promise<CurrentStudent | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'student') return null
  return { id: profile.id, fullName: profile.full_name }
}

export type StudentWorkout = {
  id: string
  name: string
  type: string | null
  weekNumber: number
  weekName: string | null
  estimatedMin: number | null
  exerciseCount: number
  /** intentos completados de ESTA sesión por el alumno */
  timesDone: number
  lastDoneAt: string | null
}

export type StudentActivePlan = {
  id: string
  name: string
  objective: string | null
  startDate: string | null
  endDate: string | null
  /** longitud del ciclo = total de sesiones en todas las semanas */
  cycleLength: number
  /** vuelta actual del ciclo (1-based) */
  cycleNumber: number
  /** sesión sugerida para hoy (la siguiente sin hacer en el ciclo) */
  nextWorkoutId: string | null
  workouts: StudentWorkout[]
}

type WorkoutRow = {
  id: string
  name: string
  type: string | null
  estimated_duration_min: number | null
  order: number
  week_id: string
  workout_blocks: { training_items: { id: string }[] }[]
}

export async function getStudentActivePlan(studentId: string): Promise<StudentActivePlan | null> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, objective, start_date, end_date')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!plan) return null

  const { data: weeks } = await supabase
    .from('plan_weeks')
    .select('id, number, name')
    .eq('plan_id', plan.id)
    .order('number')
  const weekList = weeks ?? []
  if (weekList.length === 0) {
    return {
      id: plan.id,
      name: plan.name,
      objective: plan.objective,
      startDate: plan.start_date,
      endDate: plan.end_date,
      cycleLength: 0,
      cycleNumber: 1,
      nextWorkoutId: null,
      workouts: [],
    }
  }

  const weekIds = weekList.map((w) => w.id)
  const weekById = new Map(weekList.map((w) => [w.id, w]))

  const { data: workoutRows } = await supabase
    .from('workouts')
    .select('id, name, type, estimated_duration_min, order, week_id, workout_blocks(training_items(id))')
    .in('week_id', weekIds)
    .order('order')

  const rows = (workoutRows ?? []) as unknown as WorkoutRow[]
  // Orden del ciclo: por número de semana, luego por order de la sesión.
  rows.sort((a, b) => {
    const wa = weekById.get(a.week_id)?.number ?? 0
    const wb = weekById.get(b.week_id)?.number ?? 0
    return wa - wb || a.order - b.order
  })

  // Intentos completados por sesión.
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('workout_id, completed_at')
    .eq('student_id', studentId)
    .not('completed_at', 'is', null)
    .in(
      'workout_id',
      rows.map((r) => r.id),
    )
  const doneByWorkout = new Map<string, { count: number; last: string | null }>()
  for (const s of sessions ?? []) {
    const cur = doneByWorkout.get(s.workout_id) ?? { count: 0, last: null }
    cur.count += 1
    if (!cur.last || (s.completed_at && s.completed_at > cur.last)) cur.last = s.completed_at
    doneByWorkout.set(s.workout_id, cur)
  }

  const totalCompleted = [...doneByWorkout.values()].reduce((n, v) => n + v.count, 0)
  const cycleLength = rows.length
  const cycleNumber = Math.floor(totalCompleted / cycleLength) + 1
  const nextIndex = totalCompleted % cycleLength
  const nextWorkoutId = rows[nextIndex]?.id ?? null

  const workouts: StudentWorkout[] = rows.map((r) => {
    const w = weekById.get(r.week_id)
    const done = doneByWorkout.get(r.id)
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      weekNumber: w?.number ?? 0,
      weekName: w?.name ?? null,
      estimatedMin: r.estimated_duration_min,
      exerciseCount: (r.workout_blocks ?? []).reduce(
        (n, b) => n + (b.training_items?.length ?? 0),
        0,
      ),
      timesDone: done?.count ?? 0,
      lastDoneAt: done?.last ?? null,
    }
  })

  return {
    id: plan.id,
    name: plan.name,
    objective: plan.objective,
    startDate: plan.start_date,
    endDate: plan.end_date,
    cycleLength,
    cycleNumber,
    nextWorkoutId,
    workouts,
  }
}

// ============================================================
// El día (workout): bloques → ejercicios → prescripción + video,
// más lo que el alumno ya registró en su sesión abierta.
// ============================================================
export type StudentPrescription = {
  sets: string | null
  reps: string | null
  loadKg: number | null
  loadPercent: number | null
  intensityRpe: string | null
  restLabel: string | null
  timeSec: number | null
  distanceM: number | null
  pace: string | null
  tempo: string | null
  notes: string | null
}

export type StudentLog = {
  setNumber: number
  loadKg: number | null
  reps: string | null
  rpe: number | null
  comments: string | null
}

export type StudentDayItem = {
  id: string
  exerciseName: string | null
  activityName: string | null
  patternName: string | null
  muscleName: string | null
  label: string | null
  videoId: string | null
  prescription: StudentPrescription | null
  logs: StudentLog[]
}

export type StudentDayBlock = {
  id: string
  kind: string
  rounds: number | null
  items: StudentDayItem[]
}

export type StudentDay = {
  workoutId: string
  name: string
  type: string | null
  objective: string | null
  weekNumber: number
  planName: string
  sessionId: string | null
  sessionCompletedAt: string | null
  feelingNote: string | null
  blocks: StudentDayBlock[]
}

function ytId(url: string | undefined | null): string | null {
  if (!url) return null
  const m = url.match(/(?:shorts\/|watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export async function getStudentDay(
  studentId: string,
  workoutId: string,
): Promise<StudentDay | null> {
  const supabase = await createClient()

  const { data: workout } = await supabase
    .from('workouts')
    .select('id, name, type, objective, week_id, plan_weeks(number, plans(name))')
    .eq('id', workoutId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!workout) return null

  const w = workout as unknown as {
    id: string
    name: string
    type: string | null
    objective: string | null
    plan_weeks: { number: number; plans: { name: string } | null } | null
  }

  const { data: blocksData } = await supabase
    .from('workout_blocks')
    .select(
      `
      id, kind, rounds, order,
      training_items(
        id, exercise_id, activity_name, label, order,
        exercises(canonical_name, patterns(display_name), muscles(display_name), exercise_media(url, is_primary, type)),
        workout_prescriptions(sets, reps, load_kg, load_percent, intensity_rpe, rest_label, time_sec, distance_m, pace, tempo, notes)
      )
    `,
    )
    .eq('workout_id', workoutId)
    .order('order')

  // Sesión abierta (sin completar) del alumno para este día + lo registrado.
  const { data: openSession } = await supabase
    .from('workout_sessions')
    .select('id, completed_at, feeling_note')
    .eq('workout_id', workoutId)
    .eq('student_id', studentId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const logsByItem = new Map<string, StudentLog[]>()
  if (openSession) {
    const { data: perf } = await supabase
      .from('workout_performance')
      .select('training_item_id, set_number, actual_load_kg, actual_reps, rpe, comments')
      .eq('session_id', openSession.id)
    for (const p of perf ?? []) {
      const list = logsByItem.get(p.training_item_id) ?? []
      list.push({
        setNumber: p.set_number,
        loadKg: p.actual_load_kg,
        reps: p.actual_reps,
        rpe: p.rpe,
        comments: p.comments,
      })
      logsByItem.set(p.training_item_id, list)
    }
  }

  type ItemRow = {
    id: string
    activity_name: string | null
    label: string | null
    order: number
    exercises: {
      canonical_name: string
      patterns: { display_name: string } | null
      muscles: { display_name: string } | null
      exercise_media: { url: string; is_primary: boolean; type: string }[]
    } | null
    workout_prescriptions:
      | {
          sets: string | null
          reps: string | null
          load_kg: number | null
          load_percent: number | null
          intensity_rpe: string | null
          rest_label: string | null
          time_sec: number | null
          distance_m: number | null
          pace: string | null
          tempo: string | null
          notes: string | null
        }[]
      | null
  }
  type BlockRow = { id: string; kind: string; rounds: number | null; order: number; training_items: ItemRow[] }

  const blocks: StudentDayBlock[] = ((blocksData ?? []) as unknown as BlockRow[]).map((b) => ({
    id: b.id,
    kind: b.kind,
    rounds: b.rounds,
    items: (b.training_items ?? [])
      .sort((a, z) => a.order - z.order)
      .map((it) => {
        const media =
          it.exercises?.exercise_media?.find((m) => m.type === 'video' && m.is_primary) ??
          it.exercises?.exercise_media?.find((m) => m.type === 'video')
        const raw = Array.isArray(it.workout_prescriptions)
          ? it.workout_prescriptions[0]
          : it.workout_prescriptions
        return {
          id: it.id,
          exerciseName: it.exercises?.canonical_name ?? null,
          activityName: it.activity_name,
          patternName: it.exercises?.patterns?.display_name ?? null,
          muscleName: it.exercises?.muscles?.display_name ?? null,
          label: it.label,
          videoId: ytId(media?.url),
          prescription: raw
            ? {
                sets: raw.sets,
                reps: raw.reps,
                loadKg: raw.load_kg,
                loadPercent: raw.load_percent,
                intensityRpe: raw.intensity_rpe,
                restLabel: raw.rest_label,
                timeSec: raw.time_sec,
                distanceM: raw.distance_m,
                pace: raw.pace,
                tempo: raw.tempo,
                notes: raw.notes,
              }
            : null,
          logs: (logsByItem.get(it.id) ?? []).sort((a, z) => a.setNumber - z.setNumber),
        }
      }),
  }))

  return {
    workoutId: w.id,
    name: w.name,
    type: w.type,
    objective: w.objective,
    weekNumber: w.plan_weeks?.number ?? 0,
    planName: w.plan_weeks?.plans?.name ?? 'Plan',
    sessionId: openSession?.id ?? null,
    sessionCompletedAt: openSession?.completed_at ?? null,
    feelingNote: openSession?.feeling_note ?? null,
    blocks,
  }
}

// ============================================================
// Historial: sesiones completadas del alumno.
// ============================================================
export type StudentHistoryEntry = {
  sessionId: string
  workoutId: string
  workoutName: string
  completedAt: string
  feelingNote: string | null
  loggedCount: number
}

export async function getStudentHistory(studentId: string): Promise<StudentHistoryEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workout_sessions')
    .select('id, workout_id, completed_at, feeling_note, workouts(name), workout_performance(id)')
    .eq('student_id', studentId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(60)

  return ((data ?? []) as unknown as {
    id: string
    workout_id: string
    completed_at: string
    feeling_note: string | null
    workouts: { name: string } | null
    workout_performance: { id: string }[]
  }[]).map((s) => ({
    sessionId: s.id,
    workoutId: s.workout_id,
    workoutName: s.workouts?.name ?? 'Sesión',
    completedAt: s.completed_at,
    feelingNote: s.feeling_note,
    loggedCount: s.workout_performance?.length ?? 0,
  }))
}
