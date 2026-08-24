import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { MetricCards } from '@/components/professor/metric-cards'
import { QuickAlerts } from '@/components/professor/quick-alerts'
import { StudentsTable } from '@/components/professor/students-table'
import { VolumePanel } from '@/components/professor/volume-panel'

export default function ProfessorDashboardPage() {
  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <MetricCards />

          <section aria-label="Alertas y volumen" className="grid gap-4 xl:grid-cols-[1.85fr_1fr]">
            <QuickAlerts />
            <VolumePanel />
          </section>

          <StudentsTable />
        </main>
      </div>
    </div>
  )
}
