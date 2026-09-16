import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ClipboardList } from 'lucide-react'

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

export default async function AlumnoPlanPage({
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

  const backLinks = (
    <div className="-mb-1 flex items-center justify-between gap-2">
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Inicio
      </Link>
      {student.role === 'individual' ? (
        <Link
          href="/planes"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
        >
          <ClipboardList className="size-4" />
          Mis planes
        </Link>
      ) : null}
    </div>
  )

  if (plans.length === 0) {
    return (
      <StudentShell signOut={signOut}>
        {backLinks}
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Tu entrenamiento</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola {student.fullName.split(' ')[0]}
        </h1>
        <div className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          {student.role === 'individual'
            ? 'Todavía no armaste un plan activo. Creá uno en "Mis planes" y va a aparecer acá.'
            : 'Todavía no tenés un plan activo. Cuando tu profe te asigne uno, va a aparecer acá.'}
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
      {backLinks}
      <StudentWeekView
        studentName={student.fullName}
        plans={plans}
        activePlanId={activePlan.id}
        week={week}
      />
    </StudentShell>
  )
}
