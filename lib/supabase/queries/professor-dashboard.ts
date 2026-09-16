import { createClient } from '@/lib/supabase/server'
import { getCurrentAdmin } from '@/lib/supabase/queries/admin'

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

export type CurrentLibraryActor = { id: string; fullName: string }

/**
 * Actor autorizado a gestionar la biblioteca: profesor activo O admin (el
 * admin gestiona con las mismas reglas de dueño que un profesor — ver
 * supabase/migrations/20260828000039_admin_library_access.sql). null si
 * ninguno de los dos.
 */
export async function getCurrentLibraryActor(): Promise<CurrentLibraryActor | null> {
  const professor = await getCurrentProfessor()
  if (professor) return professor
  const admin = await getCurrentAdmin()
  if (admin) return admin
  return null
}

export type CurrentPlanActor = {
  id: string
  fullName: string
  role: 'professor' | 'individual' | 'admin'
}

/**
 * Actor autorizado a abrir/editar un plan: profesor activo (cualquier
 * plan que le pertenezca por RLS), individuo autocoacheado (solo el
 * suyo, professor_id null — 20260828000008) o admin (cualquier plan —
 * 20260828000040). Toda la autorización real por fila la hace RLS; este
 * helper solo resuelve QUIÉN está logueado.
 */
export async function getCurrentPlanActor(): Promise<CurrentPlanActor | null> {
  const professor = await getCurrentProfessor()
  if (professor) return { ...professor, role: 'professor' }

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

  if (profile?.role === 'individual' || profile?.role === 'admin') {
    return { id: profile.id, fullName: profile.full_name, role: profile.role }
  }
  return null
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
  difficulty: 'facil' | 'moderado' | 'dificil' | null
}

/** Últimas sesiones completadas por los alumnos del profesor. */
export async function getRecentActivity(limit = 12): Promise<ActivityEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workout_sessions')
    .select(
      `
      id, student_id, completed_at, feeling_note, difficulty,
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
    difficulty: 'facil' | 'moderado' | 'dificil' | null
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
    difficulty: s.difficulty,
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

export type ProgressNotification = {
  kind: 'progress'
  studentId: string
  studentName: string
  latestAt: string
}

/**
 * Alumnos con "novedades": tienen una sesión completada más reciente que
 * `last_progress_viewed_at` (o nunca se abrió su ficha y ya completaron
 * algo). Alimenta la campanita — comparar es en memoria, no hay tabla de
 * notificaciones aparte (ver migración 20260828000047).
 */
export async function getProfessorNotifications(professorId: string): Promise<ProgressNotification[]> {
  const supabase = await createClient()

  const { data: relations } = await supabase
    .from('student_professors')
    .select('student_id, last_progress_viewed_at, students(profiles(full_name))')
    .eq('professor_id', professorId)
    .eq('status', 'active')

  type RelationRow = {
    student_id: string
    last_progress_viewed_at: string | null
    students: { profiles: { full_name: string } | null } | null
  }
  const rows = (relations ?? []) as unknown as RelationRow[]
  if (rows.length === 0) return []

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('student_id, completed_at')
    .in(
      'student_id',
      rows.map((r) => r.student_id),
    )
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(500)

  const latestByStudent = new Map<string, string>()
  for (const s of (sessions ?? []) as { student_id: string; completed_at: string }[]) {
    if (!latestByStudent.has(s.student_id)) latestByStudent.set(s.student_id, s.completed_at)
  }

  return rows
    .map((r) => {
      const latestAt = latestByStudent.get(r.student_id)
      if (!latestAt) return null
      if (r.last_progress_viewed_at && latestAt <= r.last_progress_viewed_at) return null
      return {
        kind: 'progress' as const,
        studentId: r.student_id,
        studentName: r.students?.profiles?.full_name ?? 'Alumno',
        latestAt,
      }
    })
    .filter((n): n is ProgressNotification => n != null)
    .sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1))
}

export type ScheduleNotification = {
  kind: 'schedule'
  studentId: string
  studentName: string
  latestAt: string
}

/**
 * Alumnos que cambiaron sus días de entreno preferido / otra disciplina
 * (`students.schedule_updated_at`) desde la última vez que el profesor
 * miró su calendario (`last_schedule_viewed_at`) — señal separada de
 * `getProfessorNotifications` a propósito (ver migración 20260828000050):
 * comparar ambas contra la misma columna mezclaría dos avisos distintos.
 */
export async function getScheduleNotifications(professorId: string): Promise<ScheduleNotification[]> {
  const supabase = await createClient()

  const { data: relations } = await supabase
    .from('student_professors')
    .select(
      'student_id, last_schedule_viewed_at, students(schedule_updated_at, profiles(full_name))',
    )
    .eq('professor_id', professorId)
    .eq('status', 'active')

  type RelationRow = {
    student_id: string
    last_schedule_viewed_at: string | null
    students: { schedule_updated_at: string | null; profiles: { full_name: string } | null } | null
  }
  const rows = (relations ?? []) as unknown as RelationRow[]

  return rows
    .map((r) => {
      const latestAt = r.students?.schedule_updated_at
      if (!latestAt) return null
      if (r.last_schedule_viewed_at && latestAt <= r.last_schedule_viewed_at) return null
      return {
        kind: 'schedule' as const,
        studentId: r.student_id,
        studentName: r.students?.profiles?.full_name ?? 'Alumno',
        latestAt,
      }
    })
    .filter((n): n is ScheduleNotification => n != null)
    .sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1))
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
