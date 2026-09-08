import { redirect } from 'next/navigation'

import { StudentHome } from '@/components/student/student-home'
import { StudentShell } from '@/components/student/student-shell'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudent, getStudentActivePlan } from '@/lib/supabase/queries/student-plan'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function AlumnoPage() {
  const student = await getCurrentStudent()
  if (!student) {
    // proxy.ts ya cubre "sin sesión". Acá: un profesor que entró por error.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    redirect(user ? '/' : '/login')
  }

  const plan = await getStudentActivePlan(student.id)

  return (
    <StudentShell signOut={signOut}>
      {plan ? (
        <StudentHome name={student.fullName} plan={plan} />
      ) : (
        <div className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Todavía no tenés un plan activo. Cuando tu profe te asigne uno, va a aparecer acá.
        </div>
      )}
    </StudentShell>
  )
}
