import { createClient } from '@/lib/supabase/server'

export type StudentWithPlan = {
  studentId: string
  fullName: string
  relationshipStatus: 'active' | 'invited' | 'ended'
  plan: {
    id: string
    name: string
    planType: 'MUSCLE' | 'PATTERN' | 'MIXED' | 'SPORT_SPECIFIC' | 'CUSTOM'
    startDate: string | null
    endDate: string | null
  } | null
}

/** Alumnos del profesor + su plan más reciente (o null si todavía no tiene ninguno), ordenados alfabéticamente. */
export async function getMyStudentsWithPlans(professorId: string): Promise<StudentWithPlan[]> {
  const supabase = await createClient()

  const [{ data: relations, error: relError }, { data: plans, error: planError }] =
    await Promise.all([
      supabase
        .from('student_professors')
        .select('status, students(id, profiles(full_name))')
        .eq('professor_id', professorId)
        .neq('status', 'ended'),
      supabase
        .from('plans')
        .select('id, name, student_id, plan_type, start_date, end_date, created_at')
        .eq('professor_id', professorId)
        .order('created_at', { ascending: false }),
    ])

  if (relError) throw new Error(`No se pudo cargar la lista de alumnos: ${relError.message}`)
  if (planError) throw new Error(`No se pudo cargar los planes: ${planError.message}`)

  type RelationRow = {
    status: 'active' | 'invited' | 'ended'
    students: { id: string; profiles: { full_name: string } | null } | null
  }
  type PlanRow = {
    id: string
    name: string
    student_id: string
    plan_type: 'MUSCLE' | 'PATTERN' | 'MIXED' | 'SPORT_SPECIFIC' | 'CUSTOM'
    start_date: string | null
    end_date: string | null
    created_at: string
  }

  const latestPlanByStudent = new Map<string, PlanRow>()
  for (const plan of (plans ?? []) as PlanRow[]) {
    if (!latestPlanByStudent.has(plan.student_id)) {
      latestPlanByStudent.set(plan.student_id, plan)
    }
  }

  const students = ((relations ?? []) as RelationRow[])
    .filter((row) => row.students)
    .map((row) => {
      const plan = latestPlanByStudent.get(row.students!.id)
      return {
        studentId: row.students!.id,
        fullName: row.students!.profiles?.full_name ?? 'Sin nombre',
        relationshipStatus: row.status,
        plan: plan
          ? {
              id: plan.id,
              name: plan.name,
              planType: plan.plan_type,
              startDate: plan.start_date,
              endDate: plan.end_date,
            }
          : null,
      }
    })

  students.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
  return students
}
