import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { FormsList } from '@/components/forms/forms-list'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getProfessorForms, getSystemTemplates } from '@/lib/supabase/queries/forms'

export default async function FormsPage() {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const [forms, templates] = await Promise.all([getProfessorForms(), getSystemTemplates()])

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Formularios" formCount={forms.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Formularios</h1>
            <p className="text-muted-foreground text-sm">
              Recopilá información del alumno antes de armar el plan.
            </p>
          </div>

          <FormsList forms={forms} templates={templates} />
        </main>
      </div>
    </div>
  )
}
