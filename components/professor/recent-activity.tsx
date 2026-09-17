import Link from 'next/link'
import { Activity, ChevronDown } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { DIFFICULTY_LABEL } from '@/lib/student-difficulty'
import type { ActivityEntry } from '@/lib/supabase/queries/professor-dashboard'

function rel(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `hace ${Math.max(1, mins)} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} días`
  return new Date(iso).toLocaleDateString('es-AR')
}

/**
 * Contraída por defecto (mismo patrón que "Avance y comentarios" en la
 * ficha del alumno) — al final del dashboard, no es lo primero que se ve.
 */
export function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <Activity className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Actividad reciente</p>
            <p className="text-muted-foreground text-xs">
              Últimas sesiones que completaron tus alumnos
            </p>
          </div>
          <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t">
          {entries.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              Todavía nadie registró una sesión.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {entries.map((e) => (
                <li key={e.sessionId}>
                  <Link
                    href={`/alumnos/${e.studentId}`}
                    className="hover:bg-muted/50 flex flex-col gap-0.5 px-5 py-3 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{e.studentName}</span>
                      <span className="text-muted-foreground text-xs">{rel(e.completedAt)}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {e.workoutName}
                      {e.planName ? ` · ${e.planName}` : ''} · {e.loggedCount} registro
                      {e.loggedCount === 1 ? '' : 's'}
                      {e.difficulty ? ` · lo sintió ${DIFFICULTY_LABEL[e.difficulty].toLowerCase()}` : ''}
                    </span>
                    {e.feelingNote ? (
                      <span className="text-muted-foreground mt-0.5 text-xs italic">
                        “{e.feelingNote}”
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </Card>
  )
}
