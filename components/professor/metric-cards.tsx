import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { metrics } from '@/lib/data/professor'
import { cn } from '@/lib/utils'

export function MetricCards() {
  return (
    <section aria-label="Métricas generales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const isAlert = metric.trendTone === 'warning'

        return (
          <Card key={metric.id} className="gap-0 py-5">
            <CardHeader className="gap-0 px-5">
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <div className="flex items-end gap-2.5">
                <span
                  className={cn(
                    'font-mono text-4xl leading-none font-medium tnum',
                    isAlert && 'text-destructive',
                  )}
                >
                  {metric.value}
                </span>
                <span
                  className={cn(
                    'mb-1 rounded-full px-1.5 py-0.5 font-mono text-[11px] leading-none tnum',
                    metric.trendTone === 'positive' && 'bg-primary/10 text-primary',
                    metric.trendTone === 'neutral' && 'bg-secondary text-muted-foreground',
                    isAlert && 'bg-destructive/10 text-destructive',
                  )}
                >
                  {metric.trend}
                </span>
              </div>
              <CardDescription className="mt-2.5 text-xs">{metric.detail}</CardDescription>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
