import { redirect } from 'next/navigation'

import { StudentShell } from '@/components/student/student-shell'
import { StudentWeekView } from '@/components/student/student-week-view'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentStudent,
  getStudentActivePlans,
  getStudentWeek,
} from '@/lib/supabase/queries/student-plan'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function AlumnoPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; week?: string }>
}) {
  const student = await getCurrentStudent()
  if (!student) {
    // proxy.ts ya cubre "sin sesión". Acá: un profesor que entró por error.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    redirect(user ? '/' : '/login')
  }

  const { plan: planParam, week: weekParam } = await searchParams
  const plans = await getStudentActivePlans(student.id)

  if (plans.length === 0) {
    return (
      <StudentShell signOut={signOut}>
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Tu entrenamiento</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola {student.fullName.split(' ')[0]}
        </h1>
        <div className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Todavía no tenés un plan activo. Cuando tu profe te asigne uno, va a aparecer acá.
        </div>
      </StudentShell>
    )
  }

  const activePlan = plans.find((p) => p.id === planParam) ?? plans[0]
  const week = await getStudentWeek(
    student.id,
    activePlan.id,
    weekParam ? Number(weekParam) : undefined,
  )

  return (
    <StudentShell signOut={signOut}>
      <StudentWeekView
        studentName={student.fullName}
        plans={plans}
        activePlanId={activePlan.id}
        week={week}
      />
    </StudentShell>
  )
}
