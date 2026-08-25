'use client'

import { useState } from 'react'
import { ChevronDown, Gauge, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DANGER_THRESHOLD, WARNING_THRESHOLD, weeklyLoad } from '@/lib/data/load-analysis'

function loadTone(series: number) {
  if (series > DANGER_THRESHOLD) return 'danger'
  if (series > WARNING_THRESHOLD) return 'warning'
  return 'ok'
}

function LoadBar({ name, series, max }: { name: string; series: number; max: number }) {
  const tone = loadTone(series)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{name}</span>
        <span
          className={cn(
            'font-mono text-xs tnum',
            tone === 'danger'
              ? 'font-semibold text-destructive'
              : tone === 'warning'
                ? 'font-semibold text-warning-foreground'
                : 'text-muted-foreground',
          )}
        >
          {series} series
        </span>
      </div>
      <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all',
            tone === 'danger' ? 'bg-destructive' : tone === 'warning' ? 'bg-warning' : 'bg-primary',
          )}
          style={{ width: `${Math.min(100, (series / max) * 100)}%` }}
        />
        <div
          aria-hidden="true"
          className="bg-foreground/25 absolute inset-y-0 w-px"
          style={{ left: `${Math.min(100, (WARNING_THRESHOLD / max) * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function LoadAnalysisPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [weekIndex, setWeekIndex] = useState(0)

  if (!open) return null

  const data = weeklyLoad[weekIndex]
  const max = Math.max(
    DANGER_THRESHOLD + 2,
    ...data.patterns.map((r) => r.series),
    ...data.muscles.map((r) => r.series),
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Análisis de carga semanal"
      className="fixed inset-0 z-50 flex justify-end bg-zinc-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-in slide-in-from-right fade-in-0 flex h-full w-full max-w-2xl flex-col bg-card shadow-2xl duration-300"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Análisis de Carga Semanal
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Revisá si el volumen de la rutina está balanceado por patrón y por músculo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Controles superiores */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Semana
            </span>
            <div className="relative">
              <select
                value={weekIndex}
                onChange={(e) => setWeekIndex(Number(e.target.value))}
                className="border-input hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-48 appearance-none rounded-lg border bg-transparent pr-8 pl-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-3 dark:bg-input/30"
              >
                {weeklyLoad.map((w, i) => (
                  <option key={w.week} value={i}>
                    {w.week}
                  </option>
                ))}
              </select>
              <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
            </div>
          </label>

          <div className="ml-auto flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <Gauge className="text-primary size-4" />
            <div className="leading-tight">
              <p className="text-primary text-[10px] font-medium tracking-wide uppercase">
                Intensidad promedio
              </p>
              <p className="text-primary text-sm font-semibold tnum">
                RPE Target: {data.rpeTarget}/10
              </p>
            </div>
          </div>
        </div>

        {/* Contenido: dos columnas */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <section className="flex flex-col gap-4">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Volumen por patrones
            </h3>
            <div className="flex flex-col gap-4">
              {data.patterns.map((row) => (
                <LoadBar key={row.name} name={row.name} series={row.series} max={max} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Volumen por músculos
            </h3>
            <div className="flex flex-col gap-4">
              {data.muscles.map((row) => (
                <LoadBar key={row.name} name={row.name} series={row.series} max={max} />
              ))}
            </div>
          </section>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border px-6 py-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="bg-primary size-2 rounded-full" /> Dentro de rango
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-warning size-2 rounded-full" /> Por encima de {WARNING_THRESHOLD}{' '}
            series
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-destructive size-2 rounded-full" /> Por encima de{' '}
            {DANGER_THRESHOLD} series
          </span>
        </div>
      </div>
    </div>
  )
}
