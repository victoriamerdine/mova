import { createClient } from '@/lib/supabase/server'

export type CurrentProfessor = {
  id: string
  fullName: string
}

/** null si no hay sesión o el usuario logueado no es profesor. */
export async function getCurrentProfessor(): Promise<CurrentProfessor | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'professor') return null

  return { id: profile.id, fullName: profile.full_name }
}

export type DashboardMetrics = {
  totalStudents: number
  activePlans: number
  workoutsToday: number
}

export async function getDashboardMetrics(professorId: string): Promise<DashboardMetrics> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ count: totalStudents }, { count: activePlans }, { count: workoutsToday }] =
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
      supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('professor_id', professorId)
        .eq('date', today),
    ])

  return {
    totalStudents: totalStudents ?? 0,
    activePlans: activePlans ?? 0,
    workoutsToday: workoutsToday ?? 0,
  }
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
