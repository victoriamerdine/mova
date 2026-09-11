import Link from 'next/link'
import { ClipboardCheck, ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { StudentSubmission } from '@/lib/supabase/queries/forms'

const STATUS: Record<StudentSubmission['status'], { label: string; cls: string }> = {
  pending: { label: 'Sin abrir', cls: 'bg-muted text-muted-foreground border-transparent' },
  started: { label: 'En progreso', cls: 'bg-warning/15 text-warning-foreground border-transparent' },
  completed: { label: 'Completado', cls: 'bg-primary/10 text-primary border-transparent' },
  expired: { label: 'Vencido', cls: 'bg-destructive/10 text-destructive border-transparent' },
}

/**
 * Formularios que respondió el alumno. Se muestra en el detalle del alumno
 * y en el editor de plan para tener esa info a mano al planificar. Si el
 * alumno no respondió ninguno, no renderiza nada.
 */
export function StudentFormsCard({ submissions }: { submissions: StudentSubmission[] }) {
  if (submissions.length === 0) return null

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardCheck className="text-muted-foreground size-4" />
          Formularios respondidos
        </CardTitle>
        <CardDescription className="text-xs">
          Respuestas del alumno para planificar. Abrí una para ver el detalle.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <ul className="divide-border divide-y">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/formularios/${s.formId}/respuestas/${s.id}`}
                className="hover:bg-muted/50 flex items-center gap-3 px-5 py-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.formName}</p>
                  <p className="text-muted-foreground text-xs">
                    {s.answered}/{s.total} respondidas
                    {s.completedAt
                      ? ` · ${new Date(s.completedAt).toLocaleDateString('es-AR')}`
                      : ` · enviado ${new Date(s.createdAt).toLocaleDateString('es-AR')}`}
                  </p>
                </div>
                <Badge className={STATUS[s.status].cls}>{STATUS[s.status].label}</Badge>
                <ExternalLink className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
