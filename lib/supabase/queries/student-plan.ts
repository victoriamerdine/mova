import { createClient } from '@/lib/supabase/server'
import type { SessionDifficulty } from '@/lib/student-difficulty'

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


export type StudentPlanSummary = {
  id: string
  name: string
  objective: string | null
  startDate: string | null
  endDate: string | null
}

/** Todos los planes activos del alumno (puede tener más de uno). */
export async function getStudentActivePlans(studentId: string): Promise<StudentPlanSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('plans')
    .select('id, name, objective, start_date, end_date, created_at')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    objective: p.objective,
    startDate: p.start_date,
    endDate: p.end_date,
  }))
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
  /** Última carga (kg) que el alumno registró para este ejercicio en
   *  cualquier sesión anterior — para pre-cargar el input la 2ª vez. */
  lastLoadKg: number | null
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
  sessionStartedAt: string | null
  sessionCompletedAt: string | null
  feelingNote: string | null
  difficulty: SessionDifficulty | null
  /** Veces que el alumno completó este día (lo llena getStudentWeek). */
  timesDone: number
  blocks: StudentDayBlock[]
}

function ytId(url: string | undefined | null): string | null {
  if (!url) return null
  const m = url.match(/(?:shorts\/|watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

const BLOCKS_SELECT = `
  id, kind, rounds, order,
  training_items(
    id, exercise_id, activity_name, label, order,
    exercises(canonical_name, patterns(display_name), muscles(display_name), exercise_media(url, is_primary, type)),
    workout_prescriptions(sets, reps, load_kg, load_percent, intensity_rpe, rest_label, time_sec, distance_m, pace, tempo, notes)
  )
`

type PrescriptionRow = {
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
  workout_prescriptions: PrescriptionRow[] | PrescriptionRow | null
}
type BlockRow = { id: string; kind: string; rounds: number | null; order: number; training_items: ItemRow[] }

function mapBlocks(
  blocksData: unknown,
  logsByItem: Map<string, StudentLog[]>,
  lastLoadByItem: Map<string, number> = new Map(),
): StudentDayBlock[] {
  return ((blocksData ?? []) as BlockRow[]).map((b) => ({
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
          lastLoadKg: lastLoadByItem.get(it.id) ?? null,
        }
      }),
  }))
}

/** Última carga (kg) no nula que el alumno registró por training_item. */
async function lastLoadsForItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  itemIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (itemIds.length === 0) return map
  const { data } = await supabase
    .from('workout_performance')
    .select('training_item_id, actual_load_kg, completed_at')
    .eq('student_id', studentId)
    .in('training_item_id', itemIds)
    .not('actual_load_kg', 'is', null)
    .order('completed_at', { ascending: false })
  for (const r of data ?? []) {
    if (!map.has(r.training_item_id) && r.actual_load_kg != null) {
      map.set(r.training_item_id, Number(r.actual_load_kg))
    }
  }
  return map
}

/** Ids de training_item que aparecen en el árbol de bloques crudo. */
function itemIdsFromBlocks(blocksData: unknown): string[] {
  return ((blocksData ?? []) as BlockRow[]).flatMap((b) =>
    (b.training_items ?? []).map((it) => it.id),
  )
}

async function openSessionLogs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<Map<string, StudentLog[]>> {
  const map = new Map<string, StudentLog[]>()
  const { data: perf } = await supabase
    .from('workout_performance')
    .select('training_item_id, set_number, actual_load_kg, actual_reps, comments')
    .eq('session_id', sessionId)
  for (const p of perf ?? []) {
    const list = map.get(p.training_item_id) ?? []
    list.push({
      setNumber: p.set_number,
      loadKg: p.actual_load_kg,
      reps: p.actual_reps,
      comments: p.comments,
    })
    map.set(p.training_item_id, list)
  }
  return map
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
    .select(BLOCKS_SELECT)
    .eq('workout_id', workoutId)
    .order('order')

  // Sesión abierta (sin completar) del alumno para este día + lo registrado.
  const { data: openSession } = await supabase
    .from('workout_sessions')
    .select('id, started_at, completed_at, feeling_note, difficulty')
    .eq('workout_id', workoutId)
    .eq('student_id', studentId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const [logsByItem, lastLoadByItem] = await Promise.all([
    openSession ? openSessionLogs(supabase, openSession.id) : new Map<string, StudentLog[]>(),
    lastLoadsForItems(supabase, studentId, itemIdsFromBlocks(blocksData)),
  ])
  const blocks = mapBlocks(blocksData, logsByItem, lastLoadByItem)

  return {
    workoutId: w.id,
    name: w.name,
    type: w.type,
    objective: w.objective,
    weekNumber: w.plan_weeks?.number ?? 0,
    planName: w.plan_weeks?.plans?.name ?? 'Plan',
    sessionId: openSession?.id ?? null,
    sessionStartedAt: openSession?.started_at ?? null,
    sessionCompletedAt: openSession?.completed_at ?? null,
    feelingNote: openSession?.feeling_note ?? null,
    difficulty: openSession?.difficulty ?? null,
    timesDone: 0,
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
  difficulty: SessionDifficulty | null
  loggedCount: number
  /** Cuánto le llevó el día en segundos (completed_at − started_at). null si
   *  no llega a un minuto — normalmente porque no usó "Iniciar". */
  durationSec: number | null
}

export async function getStudentHistory(studentId: string): Promise<StudentHistoryEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workout_sessions')
    .select(
      'id, workout_id, started_at, completed_at, feeling_note, difficulty, workouts(name), workout_performance(id)',
    )
    .eq('student_id', studentId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(180)

  return ((data ?? []) as unknown as {
    id: string
    workout_id: string
    started_at: string | null
    completed_at: string
    feeling_note: string | null
    difficulty: SessionDifficulty | null
    workouts: { name: string } | null
    workout_performance: { id: string }[]
  }[]).map((s) => {
    const secs = s.started_at
      ? Math.round((Date.parse(s.completed_at) - Date.parse(s.started_at)) / 1000)
      : null
    return {
      sessionId: s.id,
      workoutId: s.workout_id,
      workoutName: s.workouts?.name ?? 'Sesión',
      completedAt: s.completed_at,
      feelingNote: s.feeling_note,
      difficulty: s.difficulty,
      loggedCount: s.workout_performance?.length ?? 0,
      durationSec: secs != null && secs >= 60 ? secs : null,
    }
  })
}

// ============================================================
// La semana completa: todos los días con su árbol (el alumno elige el día
// desde las tabs; "Semana completa" es un resumen de solo lectura).
// ============================================================
export type StudentWeek = {
  planName: string
  weekNumber: number
  weekName: string | null
  weekNumbers: number[]
  cycleNumber: number
  days: StudentDay[]
}

export async function getStudentWeek(
  studentId: string,
  planId: string,
  weekNumber?: number,
): Promise<StudentWeek | null> {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name')
    .eq('id', planId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!plan) return null

  const { data: weeks } = await supabase
    .from('plan_weeks')
    .select('id, number, name')
    .eq('plan_id', planId)
    .order('number')
  const weekList = weeks ?? []
  if (weekList.length === 0) return null

  const weekNumbers = weekList.map((w) => w.number)
  const targetNumber = weekNumber && weekNumbers.includes(weekNumber) ? weekNumber : weekNumbers[0]
  const activeWeek = weekList.find((w) => w.number === targetNumber)!

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, name, type, objective, order')
    .eq('week_id', activeWeek.id)
    .order('order')

  // Sesiones abiertas del alumno para los días de esta semana.
  const workoutIds = (workouts ?? []).map((w) => w.id)
  const { data: openSessions } = workoutIds.length
    ? await supabase
        .from('workout_sessions')
        .select('id, workout_id, started_at, completed_at, feeling_note, difficulty')
        .eq('student_id', studentId)
        .is('completed_at', null)
        .in('workout_id', workoutIds)
    : { data: [] }
  const openByWorkout = new Map(
    (openSessions ?? []).map((s) => [
      s.workout_id,
      s as {
        id: string
        started_at: string | null
        completed_at: string | null
        feeling_note: string | null
        difficulty: SessionDifficulty | null
      },
    ]),
  )

  // Veces completadas por día.
  const { data: doneRows } = workoutIds.length
    ? await supabase
        .from('workout_sessions')
        .select('workout_id')
        .eq('student_id', studentId)
        .not('completed_at', 'is', null)
        .in('workout_id', workoutIds)
    : { data: [] }
  const timesDoneByWorkout = new Map<string, number>()
  for (const r of doneRows ?? [])
    timesDoneByWorkout.set(r.workout_id, (timesDoneByWorkout.get(r.workout_id) ?? 0) + 1)

  const days: StudentDay[] = []
  for (const wk of workouts ?? []) {
    const { data: blocksData } = await supabase
      .from('workout_blocks')
      .select(BLOCKS_SELECT)
      .eq('workout_id', wk.id)
      .order('order')
    const open = openByWorkout.get(wk.id)
    const [logsByItem, lastLoadByItem] = await Promise.all([
      open ? openSessionLogs(supabase, open.id) : new Map<string, StudentLog[]>(),
      lastLoadsForItems(supabase, studentId, itemIdsFromBlocks(blocksData)),
    ])
    days.push({
      workoutId: wk.id,
      name: wk.name,
      type: wk.type,
      objective: wk.objective,
      weekNumber: activeWeek.number,
      planName: plan.name,
      sessionId: open?.id ?? null,
      sessionStartedAt: open?.started_at ?? null,
      sessionCompletedAt: open?.completed_at ?? null,
      feelingNote: open?.feeling_note ?? null,
      difficulty: open?.difficulty ?? null,
      timesDone: timesDoneByWorkout.get(wk.id) ?? 0,
      blocks: mapBlocks(blocksData, logsByItem, lastLoadByItem),
    })
  }

  // Vuelta del ciclo en curso.
  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select('id, week_id')
    .in('week_id', weekList.map((w) => w.id))
  const { data: doneSessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('student_id', studentId)
    .not('completed_at', 'is', null)
    .in(
      'workout_id',
      (allWorkouts ?? []).map((w) => w.id),
    )
  const totalDone = doneSessions?.length ?? 0
  const cycleLen = allWorkouts?.length || 1
  const cycleNumber = Math.floor(totalDone / cycleLen) + 1

  return {
    planName: plan.name,
    weekNumber: activeWeek.number,
    weekName: activeWeek.name,
    weekNumbers,
    cycleNumber,
    days,
  }
}
