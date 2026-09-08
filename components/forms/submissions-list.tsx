import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SubmissionListItem } from '@/lib/supabase/queries/forms'

const STATUS: Record<SubmissionListItem['status'], { label: string; cls: string }> = {
  pending: { label: 'Sin abrir', cls: 'bg-muted text-muted-foreground border-transparent' },
  started: { label: 'En progreso', cls: 'bg-warning/15 text-warning-foreground border-transparent' },
  completed: { label: 'Completado', cls: 'bg-primary/10 text-primary border-transparent' },
  expired: { label: 'Vencido', cls: 'bg-destructive/10 text-destructive border-transparent' },
}

export function SubmissionsList({
  formId,
  submissions,
}: {
  formId: string
  submissions: SubmissionListItem[]
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm">
          {submissions.length} envío{submissions.length === 1 ? '' : 's'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {submissions.length === 0 ? (
          <div className="text-muted-foreground px-5 py-12 text-center text-sm">
            Todavía no enviaste este formulario a nadie.
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {submissions.map((s) => {
              const st = STATUS[s.status]
              return (
                <li key={s.id}>
                  <Link
                    href={`/formularios/${formId}/respuestas/${s.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-5 py-3.5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.respondent}
                        {s.isProspect ? (
                          <span className="text-muted-foreground font-normal"> · prospecto</span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {s.answered}/{s.total} respondidas
                        {s.completedAt
                          ? ` · ${new Date(s.completedAt).toLocaleDateString()}`
                          : ` · enviado ${new Date(s.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge className={st.cls}>{st.label}</Badge>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
