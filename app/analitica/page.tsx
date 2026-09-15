import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getProfessorRoster } from '@/lib/supabase/queries/analytics'

export default async function AnalyticsPage() {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const roster = await getProfessorRoster(professor.id)

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Analítica" studentCount={roster.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Analítica</h1>
            <p className="text-muted-foreground text-xs">
              Sesiones completadas esta semana, contra la frecuencia del plan activo. Tocá un
              alumno para ver su volumen por músculo, patrón y capacidad.
            </p>
          </div>

          {roster.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              Todavía no tenés alumnos activos.
            </p>
          ) : (
            <div className="border-border overflow-hidden rounded-xl border">
              <ul className="divide-border divide-y">
                {roster.map((r) => {
                  const short = r.frequencyTarget != null && r.sessionsThisWeek < r.frequencyTarget
                  return (
                    <li key={r.studentId}>
                      <Link
                        href={`/alumnos/${r.studentId}/analitica`}
                        className="hover:bg-muted/50 flex items-center gap-3 px-5 py-3.5 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.studentName}</p>
                          <p className="text-muted-foreground text-xs">
                            {r.planName ?? 'Sin plan activo'}
                          </p>
                        </div>
                        <span
                          className={
                            short
                              ? 'text-warning-foreground bg-warning/15 tnum rounded-full px-2.5 py-1 text-xs font-medium'
                              : 'text-muted-foreground tnum text-xs'
                          }
                        >
                          {r.sessionsThisWeek}
                          {r.frequencyTarget != null ? ` / ${r.frequencyTarget}` : ''} sesiones
                        </span>
                        <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
