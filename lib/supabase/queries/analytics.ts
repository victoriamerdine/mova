import { createClient } from '@/lib/supabase/server'
import {
  calculateWeeklyTotals,
  compareProgramadoRealizado,
  mondayOf,
  type ComparisonRow,
  type VolumeInput,
  type VolumeRow,
} from '@/lib/analytics/training-load'
import { calculateVolumeByGroup } from '@/lib/volume-calc'

// ============================================================
// Fase 8 — Analytics del alumno (volumen/intensidad realizados por
// músculo/patrón/capacidad, por semana, y programado vs. realizado).
// Lo lee tanto el profesor (RLS: is_professor_of) como el propio alumno
// (RLS: is_own_student) — mismo query, cada uno ve solo lo que le
// corresponde.
// ============================================================

export type WeeklyTrainingLoad = {
  weekStart: string
  sessions: number
  hours: number
  totalSeries: number
  avgIntensity: number | null
  byMuscle: VolumeRow[]
  byPattern: VolumeRow[]
  byCapacity: VolumeRow[]
}

export type TrainingLoadReport = {
  /** Semanas con al menos una sesión completada, de la más antigua a la más reciente. */
  weeks: WeeklyTrainingLoad[]
  /**
   * Programado vs. realizado: "programado" sale de la semana 1 del plan
   * activo más reciente (el plan es un ciclo que se repite — no hay una
   * fecha fija por semana, ver CLAUDE.md Fase 7 — así que se usa esa
   * primera semana como plantilla representativa de "una semana de este
   * plan"). "Realizado" es la última semana calendario con sesiones.
   * `null` si no hay plan activo o no hay ninguna sesión completada.
   */
  programadoVsRealizado: {
    planName: string
    byMuscle: ComparisonRow[]
    byPattern: ComparisonRow[]
  } | null
}

type PerfRow = {
  session_id: string
  training_item_id: string
  rpe: number | null
}

type ItemGroupInfo = {
  muscleId: string | null
  muscleName: string | null
  patternId: string | null
  patternName: string | null
  capacities: { id: string; name: string }[]
}

/** Arma los VolumeInput por agrupación a partir de sets ya contados por ítem. */
function buildGroupInputs(
  countsByItem: Map<string, { count: number; rpes: number[] }>,
  infoByItem: Map<string, ItemGroupInfo>,
): { byMuscle: VolumeInput[]; byPattern: VolumeInput[]; byCapacity: VolumeInput[] } {
  const byMuscle: VolumeInput[] = []
  const byPattern: VolumeInput[] = []
  const byCapacity: VolumeInput[] = []

  for (const [itemId, { count, rpes }] of countsByItem) {
    const info = infoByItem.get(itemId)
    if (!info) continue
    const sets = String(count)
    const intensityRpe = rpes.length > 0 ? String(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null

    if (info.muscleId) byMuscle.push({ groupId: info.muscleId, groupName: info.muscleName, sets, intensityRpe })
    if (info.patternId) byPattern.push({ groupId: info.patternId, groupName: info.patternName, sets, intensityRpe })
    for (const cap of info.capacities) {
      byCapacity.push({ groupId: cap.id, groupName: cap.name, sets, intensityRpe })
    }
  }

  return { byMuscle, byPattern, byCapacity }
}

export async function getStudentTrainingLoad(
  studentId: string,
  weeksBack = 6,
): Promise<TrainingLoadReport> {
  const supabase = await createClient()
  const since = new Date(Date.now() - weeksBack * 7 * 86_400_000).toISOString()

  const { data: sessionsData } = await supabase
    .from('workout_sessions')
    .select('id, started_at, completed_at')
    .eq('student_id', studentId)
    .not('completed_at', 'is', null)
    .gte('completed_at', since)

  const sessions = (sessionsData ?? []) as { id: string; started_at: string; completed_at: string }[]

  const weeklyByKey = new Map<string, { sessionIds: Set<string>; hours: number }>()
  for (const s of sessions) {
    const key = mondayOf(new Date(s.completed_at))
    const bucket = weeklyByKey.get(key) ?? { sessionIds: new Set(), hours: 0 }
    bucket.sessionIds.add(s.id)
    const durationMs = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()
    if (durationMs > 0) bucket.hours += durationMs / 3_600_000
    weeklyByKey.set(key, bucket)
  }

  let perf: PerfRow[] = []
  if (sessions.length > 0) {
    const { data: perfData } = await supabase
      .from('workout_performance')
      .select('session_id, training_item_id, rpe')
      .in(
        'session_id',
        sessions.map((s) => s.id),
      )
    perf = (perfData ?? []) as PerfRow[]
  }

  const itemIds = [...new Set(perf.map((p) => p.training_item_id))]
  const infoByItem = await getGroupInfoByTrainingItem(supabase, itemIds)

  const sessionWeek = new Map<string, string>()
  for (const [key, bucket] of weeklyByKey) {
    for (const id of bucket.sessionIds) sessionWeek.set(id, key)
  }

  // Contar sets (filas de workout_performance) por (semana, training_item).
  const countsByWeekItem = new Map<string, Map<string, { count: number; rpes: number[] }>>()
  for (const p of perf) {
    const week = sessionWeek.get(p.session_id)
    if (!week) continue
    let byItem = countsByWeekItem.get(week)
    if (!byItem) {
      byItem = new Map()
      countsByWeekItem.set(week, byItem)
    }
    const entry = byItem.get(p.training_item_id) ?? { count: 0, rpes: [] }
    entry.count += 1
    if (p.rpe != null) entry.rpes.push(p.rpe)
    byItem.set(p.training_item_id, entry)
  }

  const weeks: WeeklyTrainingLoad[] = [...weeklyByKey.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, bucket]) => {
      const countsByItem = countsByWeekItem.get(weekStart) ?? new Map()
      const { byMuscle, byPattern, byCapacity } = buildGroupInputs(countsByItem, infoByItem)
      const muscleRows = calculateVolumeByGroup(byMuscle)
      const patternRows = calculateVolumeByGroup(byPattern)
      const capacityRows = calculateVolumeByGroup(byCapacity)
      const { totalSeries, avgIntensity } = calculateWeeklyTotals(patternRows.length > 0 ? patternRows : muscleRows)
      return {
        weekStart,
        sessions: bucket.sessionIds.size,
        hours: Math.round(bucket.hours * 10) / 10,
        totalSeries,
        avgIntensity,
        byMuscle: muscleRows,
        byPattern: patternRows,
        byCapacity: capacityRows,
      }
    })

  const programadoVsRealizado = await getProgramadoVsRealizado(supabase, studentId, weeks)

  return { weeks, programadoVsRealizado }
}

async function getGroupInfoByTrainingItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemIds: string[],
): Promise<Map<string, ItemGroupInfo>> {
  const infoByItem = new Map<string, ItemGroupInfo>()
  if (itemIds.length === 0) return infoByItem

  const { data } = await supabase
    .from('training_items')
    .select(
      `
      id,
      exercises(
        muscle_id, pattern_id,
        muscles(display_name), patterns(display_name),
        exercise_capacities(capacity_id, training_capacities(name))
      )
    `,
    )
    .in('id', itemIds)

  type Row = {
    id: string
    exercises: {
      muscle_id: string | null
      pattern_id: string | null
      muscles: { display_name: string } | null
      patterns: { display_name: string } | null
      exercise_capacities: { capacity_id: string; training_capacities: { name: string } | null }[]
    } | null
  }

  for (const row of ((data ?? []) as unknown as Row[])) {
    const ex = row.exercises
    infoByItem.set(row.id, {
      muscleId: ex?.muscle_id ?? null,
      muscleName: ex?.muscles?.display_name ?? null,
      patternId: ex?.pattern_id ?? null,
      patternName: ex?.patterns?.display_name ?? null,
      capacities: (ex?.exercise_capacities ?? [])
        .filter((c) => c.training_capacities)
        .map((c) => ({ id: c.capacity_id, name: c.training_capacities!.name })),
    })
  }
  return infoByItem
}

async function getProgramadoVsRealizado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  weeks: WeeklyTrainingLoad[],
): Promise<TrainingLoadReport['programadoVsRealizado']> {
  const lastWeek = weeks[weeks.length - 1]
  if (!lastWeek) return null

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!plan) return null

  const { data: week1 } = await supabase
    .from('plan_weeks')
    .select('id')
    .eq('plan_id', plan.id)
    .order('number', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!week1) return null

  const { data: workouts } = await supabase.from('workouts').select('id').eq('week_id', week1.id)
  const workoutIds = (workouts ?? []).map((w) => w.id)
  if (workoutIds.length === 0) return null

  const { data: blocksData } = await supabase
    .from('workout_blocks')
    .select('id, rounds, kind, training_items(id, exercise_id)')
    .in('workout_id', workoutIds)

  type BlockRow = {
    id: string
    rounds: number | null
    kind: string
    training_items: { id: string; exercise_id: string | null }[]
  }
  const blocks = (blocksData ?? []) as unknown as BlockRow[]
  const itemToExercise = new Map<string, string>()
  for (const b of blocks) {
    for (const it of b.training_items) {
      if (it.exercise_id) itemToExercise.set(it.id, it.exercise_id)
    }
  }

  const { data: prescriptions } = await supabase
    .from('workout_prescriptions')
    .select('training_item_id, sets, intensity_rpe')
    .in('training_item_id', [...itemToExercise.keys()])

  const exerciseIds = [...new Set(itemToExercise.values())]
  const { data: exData } = await supabase
    .from('exercises')
    .select('id, muscle_id, pattern_id, muscles(display_name), patterns(display_name)')
    .in('id', exerciseIds)

  type ExRow = {
    id: string
    muscle_id: string | null
    pattern_id: string | null
    muscles: { display_name: string } | null
    patterns: { display_name: string } | null
  }
  const exById = new Map(((exData ?? []) as unknown as ExRow[]).map((e) => [e.id, e]))

  const byMuscle: VolumeInput[] = []
  const byPattern: VolumeInput[] = []
  for (const p of (prescriptions ?? []) as { training_item_id: string; sets: string | null; intensity_rpe: string | null }[]) {
    const exId = itemToExercise.get(p.training_item_id)
    const ex = exId ? exById.get(exId) : null
    if (!ex) continue
    if (ex.muscle_id) {
      byMuscle.push({ groupId: ex.muscle_id, groupName: ex.muscles?.display_name ?? null, sets: p.sets, intensityRpe: p.intensity_rpe })
    }
    if (ex.pattern_id) {
      byPattern.push({ groupId: ex.pattern_id, groupName: ex.patterns?.display_name ?? null, sets: p.sets, intensityRpe: p.intensity_rpe })
    }
  }

  return {
    planName: plan.name,
    byMuscle: compareProgramadoRealizado(calculateVolumeByGroup(byMuscle), lastWeek.byMuscle),
    byPattern: compareProgramadoRealizado(calculateVolumeByGroup(byPattern), lastWeek.byPattern),
  }
}

// ============================================================
// Resumen agregado para el profesor (roster): adherencia por alumno esta
// semana, comparada contra `plans.frequency_per_week` cuando el plan activo
// la tiene cargada.
// ============================================================

export type RosterRow = {
  studentId: string
  studentName: string
  sessionsThisWeek: number
  frequencyTarget: number | null
  planName: string | null
}

export async function getProfessorRoster(professorId: string): Promise<RosterRow[]> {
  const supabase = await createClient()
  const weekStart = mondayOf(new Date())

  const { data: relations } = await supabase
    .from('student_professors')
    .select('student_id, students(id, profiles(full_name))')
    .eq('professor_id', professorId)
    .eq('status', 'active')

  type RelRow = { student_id: string; students: { profiles: { full_name: string } | null } | null }
  const students = ((relations ?? []) as unknown as RelRow[]).map((r) => ({
    id: r.student_id,
    name: r.students?.profiles?.full_name ?? 'Alumno',
  }))
  if (students.length === 0) return []

  const [{ data: sessionsData }, { data: plansData }] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('student_id, completed_at')
      .in(
        'student_id',
        students.map((s) => s.id),
      )
      .not('completed_at', 'is', null)
      .gte('completed_at', `${weekStart}T00:00:00.000Z`),
    supabase
      .from('plans')
      .select('student_id, name, frequency_per_week')
      .in(
        'student_id',
        students.map((s) => s.id),
      )
      .eq('status', 'active')
      .order('start_date', { ascending: false }),
  ])

  const sessionsCountByStudent = new Map<string, number>()
  for (const s of (sessionsData ?? []) as { student_id: string }[]) {
    sessionsCountByStudent.set(s.student_id, (sessionsCountByStudent.get(s.student_id) ?? 0) + 1)
  }

  // El plan más reciente por alumno (plansData ya viene ordenado por start_date desc).
  const planByStudent = new Map<string, { name: string; frequency_per_week: number | null }>()
  for (const p of (plansData ?? []) as { student_id: string; name: string; frequency_per_week: number | null }[]) {
    if (!planByStudent.has(p.student_id)) planByStudent.set(p.student_id, p)
  }

  return students.map((s) => ({
    studentId: s.id,
    studentName: s.name,
    sessionsThisWeek: sessionsCountByStudent.get(s.id) ?? 0,
    frequencyTarget: planByStudent.get(s.id)?.frequency_per_week ?? null,
    planName: planByStudent.get(s.id)?.name ?? null,
  }))
}
