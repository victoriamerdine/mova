import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { MinimalHeader } from '@/components/minimal-header'
import { PlanEditorClient } from '@/components/professor/plan-editor/plan-editor-client'
import { StudentFormsCard } from '@/components/forms/student-forms-card'
import { getCurrentPlanActor, getMyStudents } from '@/lib/supabase/queries/professor-dashboard'
import { getStudentSubmissions } from '@/lib/supabase/queries/forms'
import {
  getPlanBuilderCatalog,
  getPlanForEditor,
  getStudentLoadTargets,
} from '@/lib/supabase/queries/plan-editor'

export default async function PlanEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>
  searchParams: Promise<{ week?: string; error?: string }>
}) {
  const actor = await getCurrentPlanActor()
  if (!actor) redirect('/login')

  const { planId } = await params
  const { week, error } = await searchParams
  const [plan, catalog] = await Promise.all([getPlanForEditor(planId, week), getPlanBuilderCatalog()])

  if (!plan) notFound()

  const [loadTargets, formSubmissions, myStudents] = await Promise.all([
    getStudentLoadTargets(plan.studentId),
    actor.role === 'individual' ? Promise.resolve([]) : getStudentSubmissions(plan.studentId),
    actor.role === 'professor' ? getMyStudents(actor.id) : Promise.resolve([]),
  ])

  // Incluir el alumno actual para permitir duplicar al mismo alumno
  const allStudents = [
    { id: plan.studentId, fullName: plan.studentName },
    ...myStudents.filter((s) => s.status === 'active' && s.id !== plan.studentId).map((s) => ({ id: s.id, fullName: s.fullName })),
  ]

  const editor = (
    <main className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div>
        {actor.role === 'professor' ? (
          <Link href="/alumnos" className="text-muted-foreground text-xs hover:underline">
            ← Mis alumnos
          </Link>
        ) : (
          <Link href="/planes" className="text-muted-foreground text-xs hover:underline">
            ← Mis planes
          </Link>
        )}
        <h1 className="mt-1 text-lg font-semibold tracking-tight">
          {plan.name} · {plan.studentName}
        </h1>
      </div>

      {error ? (
        <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}

      {actor.role !== 'individual' ? <StudentFormsCard submissions={formSubmissions} /> : null}

      <PlanEditorClient
        plan={plan}
        catalog={catalog}
        loadTargets={loadTargets}
        showAiPanel={actor.role === 'professor'}
        otherStudents={allStudents}
      />
    </main>
  )

  if (actor.role !== 'professor') {
    return (
      <div className="bg-background flex min-h-svh flex-col">
        <MinimalHeader title="Mi plan" fullName={actor.fullName} />
        {editor}
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Planes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={actor.fullName} />
        {editor}
      </div>
    </div>
  )
}
