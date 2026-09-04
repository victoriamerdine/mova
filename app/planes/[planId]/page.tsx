import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { PlanEditorClient } from '@/components/professor/plan-editor/plan-editor-client'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getPlanBuilderCatalog, getPlanForEditor } from '@/lib/supabase/queries/plan-editor'

export default async function PlanEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>
  searchParams: Promise<{ week?: string; error?: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { planId } = await params
  const { week, error } = await searchParams
  const [plan, catalog] = await Promise.all([getPlanForEditor(planId, week), getPlanBuilderCatalog()])

  if (!plan) notFound()

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Planes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-4 px-6 py-6">
          <div>
            <Link href="/alumnos" className="text-muted-foreground text-xs hover:underline">
              ← Mis alumnos
            </Link>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">
              {plan.name} · {plan.studentName}
            </h1>
          </div>

          {error ? (
            <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
          ) : null}

          <PlanEditorClient plan={plan} catalog={catalog} />
        </main>
      </div>
    </div>
  )
}
