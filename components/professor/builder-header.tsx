'use client'

import { ChevronLeft, Gauge, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function BuilderHeader({ onOpenAnalysis }: { onOpenAnalysis?: () => void }) {
  return (
    <header className="bg-surface/85 sticky top-0 z-30 border-b border-border backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Volver al plan"
          className="text-muted-foreground -ml-1.5 shrink-0"
        >
          <ChevronLeft />
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">
            Día 1: Fuerza Tren Superior
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            Plan de Victoria · Mesociclo 2, semana 3
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onOpenAnalysis}>
            <Gauge data-icon="inline-start" />
            Análisis de carga
          </Button>
          <Button size="sm">
            <Save data-icon="inline-start" />
            Guardar plan
          </Button>
        </div>
      </div>
    </header>
  )
}
