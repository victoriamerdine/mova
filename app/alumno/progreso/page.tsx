import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { StudentShell } from '@/components/student/student-shell'
import { TrainingLoadView } from '@/components/analytics/training-load-view'
import { getCurrentStudent } from '@/lib/supabase/queries/student-plan'
import { getStudentTrainingLoad } from '@/lib/supabase/queries/analytics'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function StudentProgressPage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const report = await getStudentTrainingLoad(student.id)

  return (
    <StudentShell signOut={signOut}>
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Mi progreso</h1>
      <p className="text-muted-foreground -mt-4 text-xs">
        Lo que realmente entrenaste — series, intensidad y a qué músculos y patrones.
      </p>

      <TrainingLoadView report={report} />
    </StudentShell>
  )
}
