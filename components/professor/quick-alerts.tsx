import { ArrowUpRight, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { alerts } from '@/lib/data/professor'
import { cn } from '@/lib/utils'

export function QuickAlerts() {
  return (
    <Card className="border-warning/35 bg-warning/[0.04] gap-0 overflow-hidden py-0">
      <CardHeader className="border-warning/25 grid-cols-[auto_1fr_auto] items-center gap-x-3 border-b px-5 py-4">
        <span className="bg-warning/15 text-warning-foreground row-span-2 flex size-9 shrink-0 items-center justify-center rounded-md">
          <TriangleAlert className="size-4.5" />
        </span>
        <CardTitle className="text-sm">Atención requerida</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="bg-card row-span-2 col-start-3 hidden sm:flex"
        >
          Ver todo
          <ArrowUpRight data-icon="inline-end" />
        </Button>
        <CardDescription className="col-start-2 text-xs">
          3 avisos detectados al recalcular volumen y adherencia
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 py-0">
        <ul className="divide-warning/20 divide-y">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="hover:bg-warning/[0.06] flex items-start gap-3 px-5 py-3.5 transition-colors"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1.5 size-2 shrink-0 rounded-full',
                  alert.severity === 'alta' ? 'bg-destructive' : 'bg-warning',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug font-medium text-pretty">{alert.title}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed text-pretty">
                  {alert.detail}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-warning/40 text-warning-foreground bg-card mt-0.5 shrink-0"
              >
                {alert.tag}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
