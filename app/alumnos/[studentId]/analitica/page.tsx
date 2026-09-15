import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { TrainingLoadView } from '@/components/analytics/training-load-view'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getStudentTrainingLoad } from '@/lib/supabase/queries/analytics'

export default async function StudentAnalyticsPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { studentId } = await params
  const supabase = await createClient()

  const { data: studentRow } = await supabase
    .from('students')
    .select('profiles(full_name)')
    .eq('id', studentId)
    .maybeSingle()
  const studentName =
    (studentRow as unknown as { profiles: { full_name: string } | null } | null)?.profiles
      ?.full_name ?? 'Alumno'

  const report = await getStudentTrainingLoad(studentId)

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Alumnos" />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div>
            <Link
              href={`/alumnos/${studentId}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="size-3.5" />
              {studentName}
            </Link>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">Analítica</h1>
            <p className="text-muted-foreground text-xs">
              Volumen e intensidad realmente registrados, por músculo, patrón y capacidad.
            </p>
          </div>

          <TrainingLoadView report={report} />
        </main>
      </div>
    </div>
  )
}
