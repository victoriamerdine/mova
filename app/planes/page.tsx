import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { PlansList } from '@/components/professor/plans-list'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getPlansForProfessor } from '@/lib/supabase/queries/plans'

export default async function PlansPage() {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const plans = await getPlansForProfessor(professor.id)

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Planes" planCount={plans.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Planes</h1>
            <p className="text-muted-foreground text-sm">
              Todos los planes que armaste, de todos tus alumnos. Tocá uno para abrir el editor.
            </p>
          </div>

          <PlansList plans={plans} />
        </main>
      </div>
    </div>
  )
}
