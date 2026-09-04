import { createClient } from '@/lib/supabase/server'

export type PlanPrescription = {
  sets: string | null
  reps: string | null
  intensityRpe: string | null
  restLabel: string | null
  notes: string | null
}

export type PlanTrainingItem = {
  id: string
  exerciseId: string | null
  activityName: string | null
  label: string | null
  order: number
  exerciseName: string | null
  patternId: string | null
  patternName: string | null
  muscleId: string | null
  muscleName: string | null
  videoId: string | null
  prescription: PlanPrescription | null
}

export type PlanBlock = {
  id: string
  kind: string
  rounds: number | null
  order: number
  items: PlanTrainingItem[]
}

export type PlanDay = {
  id: string
  name: string
  order: number
  blocks: PlanBlock[]
}

export type PlanWeekOption = {
  id: string
  number: number
  name: string | null
}

export type PlanForEditor = {
  id: string
  name: string
  planType: 'MUSCLE' | 'PATTERN' | 'MIXED' | 'SPORT_SPECIFIC' | 'CUSTOM'
  startDate: string | null
  endDate: string | null
  studentName: string
  weeks: PlanWeekOption[]
  /** Semana activa en el editor — `weekId` es su id (o '' si el plan no tiene semanas). */
  weekId: string
  days: PlanDay[]
}

function extractYouTubeId(url: string | undefined): string | null {
  if (!url) return null
  const match = url.match(/(?:shorts\/|watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export async function getPlanForEditor(planId: string, weekId?: string): Promise<PlanForEditor | null> {
  const supabase = await createClient()

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, name, plan_type, start_date, end_date, students(profiles(full_name))')
    .eq('id', planId)
    .maybeSingle()

  if (planError || !plan) return null

  const studentName =
    (plan as unknown as { students: { profiles: { full_name: string } | null } | null }).students
      ?.profiles?.full_name ?? 'Alumno'

  const { data: weekRows } = await supabase
    .from('plan_weeks')
    .select('id, number, name')
    .eq('plan_id', planId)
    .order('number', { ascending: true })

  const weeks: PlanWeekOption[] = (weekRows ?? []).map((w) => ({ id: w.id, number: w.number, name: w.name }))

  if (weeks.length === 0) {
    return {
      id: plan.id,
      name: plan.name,
      planType: plan.plan_type,
      startDate: plan.start_date,
      endDate: plan.end_date,
      studentName,
      weeks: [],
      weekId: '',
      days: [],
    }
  }

  const activeWeek = weeks.find((w) => w.id === weekId) ?? weeks[0]

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, name, order')
    .eq('week_id', activeWeek.id)
    .order('order', { ascending: true })

  const days: PlanDay[] = []

  for (const workout of workouts ?? []) {
    const { data: blocksData } = await supabase
      .from('workout_blocks')
      .select(
        `
        id, kind, rounds, order,
        training_items(
          id, exercise_id, activity_name, label, order,
          exercises(canonical_name, pattern_id, muscle_id, patterns(display_name), muscles(display_name), exercise_media(url, is_primary, type)),
          workout_prescriptions(sets, reps, intensity_rpe, rest_label, notes)
        )
      `,
      )
      .eq('workout_id', workout.id)
      .order('order', { ascending: true })

    type ItemRow = {
      id: string
      exercise_id: string | null
      activity_name: string | null
      label: string | null
      order: number
      exercises: {
        canonical_name: string
        pattern_id: string | null
        muscle_id: string | null
        patterns: { display_name: string } | null
        muscles: { display_name: string } | null
        exercise_media: { url: string; is_primary: boolean; type: string }[]
      } | null
      workout_prescriptions: PlanPrescription[] | PlanPrescription | null
    }
    type BlockRow = {
      id: string
      kind: string
      rounds: number | null
      order: number
      training_items: ItemRow[]
    }

    const blocks: PlanBlock[] = ((blocksData ?? []) as unknown as BlockRow[]).map((block) => ({
      id: block.id,
      kind: block.kind,
      rounds: block.rounds,
      order: block.order,
      items: (block.training_items ?? [])
        .sort((a, b) => a.order - b.order)
        .map((item) => {
          const primaryVideo = item.exercises?.exercise_media?.find((m) => m.type === 'video' && m.is_primary)
            ?? item.exercises?.exercise_media?.find((m) => m.type === 'video')
          const prescriptionRaw = item.workout_prescriptions
          const prescription = Array.isArray(prescriptionRaw) ? prescriptionRaw[0] : prescriptionRaw

          return {
            id: item.id,
            exerciseId: item.exercise_id,
            activityName: item.activity_name,
            label: item.label,
            order: item.order,
            exerciseName: item.exercises?.canonical_name ?? null,
            patternId: item.exercises?.pattern_id ?? null,
            patternName: item.exercises?.patterns?.display_name ?? null,
            muscleId: item.exercises?.muscle_id ?? null,
            muscleName: item.exercises?.muscles?.display_name ?? null,
            videoId: extractYouTubeId(primaryVideo?.url),
            prescription: prescription ?? null,
          }
        }),
    }))

    days.push({ id: workout.id, name: workout.name, order: workout.order, blocks })
  }

  return {
    id: plan.id,
    name: plan.name,
    planType: plan.plan_type,
    startDate: plan.start_date,
    endDate: plan.end_date,
    studentName,
    weeks,
    weekId: activeWeek.id,
    days,
  }
}

export type CatalogExercise = {
  id: string
  name: string
  patternId: string | null
  muscleId: string | null
}

export type CatalogOption = { id: string; name: string }

export type PlanBuilderCatalog = {
  patterns: CatalogOption[]
  muscles: CatalogOption[]
  exercises: CatalogExercise[]
}

/** Catálogo completo para el editor: patrones, músculos, y ejercicios activos con su patrón/músculo. */
export async function getPlanBuilderCatalog(): Promise<PlanBuilderCatalog> {
  const supabase = await createClient()

  const [{ data: patterns }, { data: muscles }, { data: exercisesData }] = await Promise.all([
    supabase.from('patterns').select('id, display_name').order('sort_order'),
    supabase.from('muscles').select('id, display_name').order('sort_order'),
    supabase
      .from('exercises')
      .select('id, canonical_name, pattern_id, muscle_id')
      .eq('status', 'active')
      .order('canonical_name'),
  ])

  return {
    patterns: (patterns ?? []).map((p) => ({ id: p.id, name: p.display_name })),
    muscles: (muscles ?? []).map((m) => ({ id: m.id, name: m.display_name })),
    exercises: (exercisesData ?? []).map((e) => ({
      id: e.id,
      name: e.canonical_name,
      patternId: e.pattern_id,
      muscleId: e.muscle_id,
    })),
  }
}
