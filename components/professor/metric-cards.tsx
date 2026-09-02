import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardMetrics } from '@/lib/supabase/queries/professor-dashboard'

const CARD_DEFS: {
  key: keyof DashboardMetrics
  label: string
  detail: string
}[] = [
  { key: 'totalStudents', label: 'Alumnos activos', detail: 'Con relación activa hoy' },
  { key: 'activePlans', label: 'Planes activos', detail: 'En estado "active"' },
  { key: 'workoutsToday', label: 'Entrenamientos hoy', detail: 'Sesiones con fecha de hoy' },
]

export function MetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section aria-label="Métricas generales" className="grid gap-4 sm:grid-cols-3">
      {CARD_DEFS.map((card) => (
        <Card key={card.key} className="gap-0 py-5">
          <CardHeader className="gap-0 px-5">
            <CardTitle className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <span className="font-mono text-4xl leading-none font-medium tnum">
              {metrics[card.key]}
            </span>
            <CardDescription className="mt-2.5 text-xs">{card.detail}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
