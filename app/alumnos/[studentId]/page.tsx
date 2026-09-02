import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Plus } from 'lucide-react'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getRenewalBadge } from '@/lib/plan-renewal'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { createPlan } from '@/app/alumnos/[studentId]/actions'

const PLAN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'MUSCLE', label: 'Músculo' },
  { value: 'PATTERN', label: 'Patrones' },
  { value: 'MIXED', label: 'Mixto' },
  { value: 'SPORT_SPECIFIC', label: 'Específico de deporte' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

const PLAN_TYPE_LABEL = Object.fromEntries(PLAN_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { studentId } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: studentRow } = await supabase
    .from('students')
    .select('id, profiles(full_name)')
    .eq('id', studentId)
    .maybeSingle()

  const studentName =
    (studentRow as unknown as { profiles: { full_name: string } | null } | null)?.profiles
      ?.full_name ?? 'Alumno'

  const { data: plansData } = await supabase
    .from('plans')
    .select('id, name, plan_type, start_date, end_date, status, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const plans = plansData ?? []

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Alumnos" />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div>
            <Link href="/alumnos" className="text-muted-foreground text-xs hover:underline">
              ← Mis alumnos
            </Link>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">{studentName}</h1>
          </div>

          {error ? (
            <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
          ) : null}

          <Card className="gap-0 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">Crear plan nuevo</CardTitle>
              <CardDescription className="text-xs">
                Arranca con 2 días en blanco — los completás en el editor.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <form action={createPlan} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="studentId" value={studentId} />
                <label className="flex min-w-48 flex-1 flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Nombre del plan</span>
                  <Input type="text" name="name" required placeholder="Ej. Plan Fuerza — Mesociclo 1" />
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

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="text-sm">Planes</CardTitle>
              <CardDescription className="text-xs">
                {plans.length} plan{plans.length === 1 ? '' : 'es'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {plans.length === 0 ? (
                <div className="text-muted-foreground px-5 py-10 text-center text-sm">
                  Todavía no tiene ningún plan.
                </div>
              ) : (
                <ul className="divide-border divide-y">
                  {plans.map((plan) => {
                    const badge = getRenewalBadge(plan.start_date, plan.end_date)
                    return (
                      <li key={plan.id}>
                        <Link
                          href={`/planes/${plan.id}`}
                          className="hover:bg-muted/50 flex items-center gap-3 px-5 py-3.5 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{plan.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {PLAN_TYPE_LABEL[plan.plan_type]} · {plan.status}
                            </p>
                          </div>
                          {badge ? (
                            <Badge
                              className={
                                badge.tone === 'critical'
                                  ? 'bg-destructive/10 text-destructive border-transparent'
                                  : 'bg-warning/15 text-warning-foreground border-transparent'
                              }
                            >
                              {badge.label}
                            </Badge>
                          ) : null}
                          <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
