import Link from 'next/link'
import { CalendarClock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRenewalBadge } from '@/lib/plan-renewal'
import type { RenewalItem } from '@/lib/supabase/queries/professor-dashboard'

export function RenewalsPanel({ items }: { items: RenewalItem[] }) {
  const due = items
    .map((it) => ({ it, badge: getRenewalBadge(it.startDate, it.endDate) }))
    .filter((x) => x.badge !== null)
    .sort((a, b) => (a.badge!.tone === 'critical' ? -1 : 1))

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock className="text-muted-foreground size-4" />
          Renovaciones
        </CardTitle>
        <CardDescription className="text-xs">Planes por vencer o vencidos</CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {due.length === 0 ? (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            Ningún plan necesita renovación.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {due.map(({ it, badge }) => (
              <li key={it.planId}>
                <Link
                  href={`/planes/${it.planId}`}
                  className="hover:bg-muted/50 flex items-center gap-2 px-5 py-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.studentName}</p>
                    <p className="text-muted-foreground truncate text-xs">{it.planName}</p>
                  </div>
                  <Badge
                    className={
                      badge!.tone === 'critical'
                        ? 'bg-destructive/10 text-destructive shrink-0 border-transparent'
                        : 'bg-warning/15 text-warning-foreground shrink-0 border-transparent'
                    }
                  >
                    {badge!.label}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
