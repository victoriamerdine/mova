import { createClient } from '@/lib/supabase/server'

export type CurrentProfessor = {
  id: string
  fullName: string
}

/** null si no hay sesión o el usuario logueado no es profesor. */
/** Rol + estado del profesor logueado, sin gate. Para el login / /pendiente. */
export async function getSessionRole(): Promise<{
  role: string | null
  professorStatus: 'pending' | 'active' | 'suspended' | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { role: null, professorStatus: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = profile?.role ?? null

  let professorStatus: 'pending' | 'active' | 'suspended' | null = null
  if (role === 'professor') {
    const { data: prof } = await supabase
      .from('professors')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()
    professorStatus = prof?.status ?? null
  }
  return { role, professorStatus }
}

/** null si no hay sesión, no es profesor, o el profesor no está aprobado. */
export async function getCurrentProfessor(): Promise<CurrentProfessor | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, professors(status)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'professor') return null
  const status = (profile as unknown as { professors: { status: string } | null }).professors?.status
  if (status !== 'active') return null

  return { id: profile.id, fullName: profile.full_name }
}

export type DashboardMetrics = {
  totalStudents: number
  activePlans: number
  /** Sesiones que los alumnos completaron en los últimos 7 días. */
  sessionsThisWeek: number
}

export async function getDashboardMetrics(professorId: string): Promise<DashboardMetrics> {
  const supabase = await createClient()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [{ count: totalStudents }, { count: activePlans }, { count: sessionsThisWeek }] =
    await Promise.all([
      supabase
        .from('student_professors')
        .select('*', { count: 'exact', head: true })
        .eq('professor_id', professorId)
        .eq('status', 'active'),
      supabase
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('professor_id', professorId)
        .eq('status', 'active'),
      // RLS de workout_sessions acota a los alumnos de este profesor.
      supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .not('completed_at', 'is', null)
        .gte('completed_at', weekAgo),
    ])

  return {
    totalStudents: totalStudents ?? 0,
    activePlans: activePlans ?? 0,
    sessionsThisWeek: sessionsThisWeek ?? 0,
  }
}

export type ActivityEntry = {
  sessionId: string
  studentId: string
  studentName: string
  workoutName: string
  planName: string | null
  completedAt: string
  loggedCount: number
  feelingNote: string | null
}

/** Últimas sesiones completadas por los alumnos del profesor. */
export async function getRecentActivity(limit = 12): Promise<ActivityEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workout_sessions')
    .select(
      `
      id, student_id, completed_at, feeling_note,
      students(profiles(full_name)),
      workouts(name, plan_weeks(plans(name))),
      workout_performance(id)
    `,
    )
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as unknown as {
    id: string
    student_id: string
    completed_at: string
    feeling_note: string | null
    students: { profiles: { full_name: string } | null } | null
    workouts: { name: string; plan_weeks: { plans: { name: string } | null } | null } | null
    workout_performance: { id: string }[]
  }[]).map((s) => ({
    sessionId: s.id,
    studentId: s.student_id,
    studentName: s.students?.profiles?.full_name ?? 'Alumno',
    workoutName: s.workouts?.name ?? 'Sesión',
    planName: s.workouts?.plan_weeks?.plans?.name ?? null,
    completedAt: s.completed_at,
    loggedCount: s.workout_performance?.length ?? 0,
    feelingNote: s.feeling_note,
  }))
}

export type RenewalItem = {
  planId: string
  planName: string
  studentId: string
  studentName: string
  startDate: string | null
  endDate: string | null
}

/** Planes activos del profesor con la fecha de fin cerca o pasada. */
export async function getPlansToRenew(professorId: string): Promise<RenewalItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('plans')
    .select('id, name, start_date, end_date, student_id, students(profiles(full_name))')
    .eq('professor_id', professorId)
    .eq('status', 'active')

  return ((data ?? []) as unknown as {
    id: string
    name: string
    start_date: string | null
    end_date: string | null
    student_id: string
    students: { profiles: { full_name: string } | null } | null
  }[]).map((p) => ({
    planId: p.id,
    planName: p.name,
    studentId: p.student_id,
    studentName: p.students?.profiles?.full_name ?? 'Alumno',
    startDate: p.start_date,
    endDate: p.end_date,
  }))
}

export type MyStudent = {
  id: string
  fullName: string
  level: string | null
  status: 'active' | 'invited' | 'ended'
  since: string
}

export async function getMyStudents(professorId: string): Promise<MyStudent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_professors')
    .select('status, created_at, students(id, level, profiles(full_name))')
    .eq('professor_id', professorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`No se pudo cargar la lista de alumnos: ${error.message}`)
  }

  type Row = {
    status: 'active' | 'invited' | 'ended'
    created_at: string
    students: { id: string; level: string | null; profiles: { full_name: string } | null } | null
  }

  return (data as unknown as Row[])
    .filter((row) => row.students)
    .map((row) => ({
      id: row.students!.id,
      fullName: row.students!.profiles?.full_name ?? 'Sin nombre',
      level: row.students!.level,
      status: row.status,
      since: row.created_at,
    }))
}
