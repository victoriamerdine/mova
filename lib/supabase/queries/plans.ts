import { createClient } from '@/lib/supabase/server'

export type ProfessorPlan = {
  id: string
  name: string
  planType: 'MUSCLE' | 'PATTERN' | 'MIXED' | 'SPORT_SPECIFIC' | 'CUSTOM'
  status: 'draft' | 'active' | 'completed' | 'archived'
  startDate: string | null
  endDate: string | null
  createdAt: string
  studentId: string
  studentName: string
}

type ProfessorPlanRow = {
  id: string
  name: string
  plan_type: ProfessorPlan['planType']
  status: ProfessorPlan['status']
  start_date: string | null
  end_date: string | null
  created_at: string
  student_id: string
  students: { profiles: { full_name: string } | null } | null
}

/**
 * Todos los planes que armó el profesor, de todos sus alumnos, para la
 * pantalla "Planes". Ordenados por creación (más nuevo primero). RLS ya
 * limita a `professor_id = auth.uid()`; el join a students/profiles usa la
 * misma policy que el detalle de alumno (migración 015).
 */
export async function getPlansForProfessor(professorId: string): Promise<ProfessorPlan[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plans')
    .select(
      'id, name, plan_type, status, start_date, end_date, created_at, student_id, students(profiles(full_name))',
    )
    .eq('professor_id', professorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`No se pudieron cargar los planes: ${error.message}`)
  }

  return ((data ?? []) as unknown as ProfessorPlanRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    planType: row.plan_type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    studentId: row.student_id,
    studentName: row.students?.profiles?.full_name ?? 'Alumno',
  }))
}
