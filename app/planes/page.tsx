import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { MinimalHeader } from '@/components/minimal-header'
import { PlansList } from '@/components/professor/plans-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AiDraftPanel } from '@/components/professor/ai-draft-panel'
import { PendingDraftsPanel } from '@/components/professor/pending-drafts-panel'
import { getCurrentPlanActor } from '@/lib/supabase/queries/professor-dashboard'
import { getPlansForIndividual, getPlansForProfessor } from '@/lib/supabase/queries/plans'
import { createOwnPlan } from '@/app/planes/actions'
import { getPendingDrafts } from '@/app/planes/draft-actions'

const PLAN_TYPE_OPTIONS = [
  { value: 'MUSCLE', label: 'Músculo' },
  { value: 'PATTERN', label: 'Patrones' },
  { value: 'MIXED', label: 'Mixto' },
  { value: 'SPORT_SPECIFIC', label: 'Específico de deporte' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const actor = await getCurrentPlanActor()
  if (!actor) redirect('/login')
  if (actor.role === 'admin') redirect('/admin')

  if (actor.role === 'individual') {
    const { error } = await searchParams
    const [plans, pendingDrafts] = await Promise.all([
      getPlansForIndividual(actor.id),
      getPendingDrafts(actor.id),
    ])

    return (
      <div className="bg-background flex min-h-svh flex-col">
        <MinimalHeader title="Mis planes" fullName={actor.fullName} />

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Mis planes</h1>
            <p className="text-muted-foreground text-sm">Entrenás solo — acá armás tu propio plan.</p>
          </div>

          {error ? (
            <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
          ) : null}

          {pendingDrafts.length > 0 ? (
            <Card className="gap-0 py-5">
              <CardHeader className="px-5">
                <CardTitle className="text-sm">Borradores pendientes</CardTitle>
                <CardDescription className="text-xs">
                  Planes que la IA armó para vos — revisalos antes de aplicarlos.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5">
                <PendingDraftsPanel studentId={actor.id} drafts={pendingDrafts} />
              </CardContent>
            </Card>
          ) : null}

          <Card className="gap-0 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">Crear plan nuevo</CardTitle>
              <CardDescription className="text-xs">
                Arranca con 2 días en blanco — los completás en el editor, o generá un borrador con IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-5">
              <AiDraftPanel studentId={actor.id} forSelf={true} />
              <form action={createOwnPlan} className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-48 flex-1 flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Nombre del plan</span>
                  <Input type="text" name="name" required placeholder="Ej. Mi plan" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Tipo</span>
                  <select
                    name="planType"
                    className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
                    defaultValue="MUSCLE"
                  >
                    {PLAN_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit" className="h-8">
                  <Plus data-icon="inline-start" />
                  Crear plan
                </Button>
              </form>
            </CardContent>
          </Card>

          <PlansList plans={plans} />
        </main>
      </div>
    )
  }

  const plans = await getPlansForProfessor(actor.id)

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Planes" planCount={plans.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={actor.fullName} />

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
