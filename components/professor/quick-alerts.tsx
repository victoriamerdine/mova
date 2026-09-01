import { TriangleAlert } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Sin motor de alertas todavía (Fase 8 del roadmap — analytics/volumen no
// construido). En vez de inventar avisos, se muestra un estado vacío
// honesto en vez de datos de ejemplo (CLAUDE.md §26/§34: no afirmar cosas
// que no se calcularon de verdad).
export function QuickAlerts() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="items-center border-b px-5 py-4">
        <span className="bg-muted text-muted-foreground row-span-2 flex size-9 shrink-0 items-center justify-center rounded-md">
          <TriangleAlert className="size-4.5" />
        </span>
        <CardTitle className="text-sm">Atención requerida</CardTitle>
        <CardDescription className="col-start-2 text-xs">
          Se calcula a partir del volumen e intensidad de tus planes
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-8">
        <p className="text-muted-foreground text-center text-sm">
          Todavía no hay planes con datos suficientes para generar alertas.
        </p>
      </CardContent>
    </Card>
  )
}
