import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Sin motor de cálculo de volumen todavía (Fase 8 — calculatePatternVolume()
// y compañía, ver docs/auditoria-03-arquitectura-objetivo.md sección G, no
// construidas). Estado vacío honesto en vez de datos de ejemplo.
export function VolumePanel() {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm">Volumen por patrón</CardTitle>
        <CardDescription className="text-xs">
          Series semanales acumuladas contra objetivo
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-8">
        <p className="text-muted-foreground text-center text-sm">
          Sin datos de volumen todavía. Se va a calcular cuando tengas un plan activo con
          entrenamientos registrados.
        </p>
      </CardContent>
    </Card>
  )
}
