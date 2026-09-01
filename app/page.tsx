import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { MetricCards } from '@/components/professor/metric-cards'
import { QuickAlerts } from '@/components/professor/quick-alerts'
import { StudentsTable } from '@/components/professor/students-table'
import { VolumePanel } from '@/components/professor/volume-panel'
import {
  getCurrentProfessor,
  getDashboardMetrics,
  getMyStudents,
} from '@/lib/supabase/queries/professor-dashboard'

export default async function ProfessorDashboardPage() {
  const professor = await getCurrentProfessor()

  // proxy.ts ya protege esta ruta contra visitantes sin sesión; esto además
  // cubre el caso de una sesión válida pero de un rol que no es profesor
  // (ej. un individual entrando a "/").
  if (!professor) {
    redirect('/login')
  }

  const [metrics, students] = await Promise.all([
    getDashboardMetrics(professor.id),
    getMyStudents(professor.id),
  ])

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <MetricCards metrics={metrics} />

          <section aria-label="Alertas y volumen" className="grid gap-4 xl:grid-cols-[1.85fr_1fr]">
            <QuickAlerts />
            <VolumePanel />
          </section>

          <StudentsTable students={students} />
        </main>
      </div>
    </div>
  )
}
