import { Fragment } from 'react'

import { cn } from '@/lib/utils'
import type { TrainingLoadReport } from '@/lib/supabase/queries/analytics'
import type { ComparisonRow } from '@/lib/analytics/training-load'
import type { VolumeRow } from '@/lib/volume-calc'

function fmtWeek(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('es-AR', { timeZone: 'UTC', day: '2-digit', month: 'short' })
}

function GroupBars({ title, rows }: { title: string; rows: VolumeRow[] }) {
  const shown = rows.filter((r) => r.series > 0)
  if (shown.length === 0) return null
  const max = Math.max(...shown.map((r) => r.series))
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{title}</h3>
      {shown
        .sort((a, b) => b.series - a.series)
        .map((r) => (
          <div key={r.groupId} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate">{r.groupName}</span>
              <span className="tnum text-muted-foreground shrink-0 font-mono">
                {r.series} series{r.intensityAvg != null ? ` · RPE ${r.intensityAvg}` : ''}
              </span>
            </div>
            <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${(r.series / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
    </div>
  )
}

function ComparisonList({ title, rows }: { title: string; rows: ComparisonRow[] }) {
  const shown = rows.filter((r) => r.programado > 0 || r.realizado > 0)
  if (shown.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{title}</h4>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1.5 text-xs">
        <span className="text-muted-foreground text-[10px] uppercase" />
        <span className="text-muted-foreground text-right text-[10px] uppercase">Program.</span>
        <span className="text-muted-foreground text-right text-[10px] uppercase">Real.</span>
        <span className="text-muted-foreground text-right text-[10px] uppercase">Dif.</span>
        {shown.map((r) => (
          <Fragment key={r.groupId}>
            <span className="truncate">{r.groupName}</span>
            <span className="tnum text-right font-mono">{r.programado}</span>
            <span className="tnum text-right font-mono">{r.realizado}</span>
            <span
              className={cn(
                'tnum text-right font-mono',
                r.diffPct == null
                  ? 'text-muted-foreground'
                  : r.diffPct <= -20
                    ? 'text-destructive'
                    : r.diffPct >= 20
                      ? 'text-warning-foreground'
                      : 'text-primary',
              )}
            >
              {r.diffPct == null ? '—' : `${r.diffPct > 0 ? '+' : ''}${r.diffPct}%`}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export function TrainingLoadView({ report }: { report: TrainingLoadReport }) {
  const lastWeek = report.weeks[report.weeks.length - 1]

  if (!lastWeek) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        Todavía no hay sesiones completadas para calcular la analítica.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Sesiones', lastWeek.sessions],
          ['Series', lastWeek.totalSeries],
          ['RPE prom.', lastWeek.avgIntensity ?? '—'],
          ['Horas', lastWeek.hours],
        ].map(([label, value]) => (
          <div key={label} className="border-border bg-card rounded-xl border p-3">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{label}</p>
            <p className="tnum mt-0.5 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground -mt-3 text-[11px]">
        Semana del {fmtWeek(lastWeek.weekStart)} — la más reciente con sesiones completadas.
      </p>

      {report.programadoVsRealizado ? (
        <div className="border-border bg-muted/20 flex flex-col gap-4 rounded-xl border p-4">
          <div>
            <h3 className="text-sm font-medium">Programado vs. realizado</h3>
            <p className="text-muted-foreground text-xs">
              "{report.programadoVsRealizado.planName}" (semana 1 del plan) contra lo que el alumno
              registró la última semana. Informativo — el plan es un ciclo que se repite, así que no
              es necesariamente la misma semana calendario.
            </p>
          </div>
          <ComparisonList title="Por patrón" rows={report.programadoVsRealizado.byPattern} />
          <ComparisonList title="Por músculo" rows={report.programadoVsRealizado.byMuscle} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <GroupBars title="Volumen por patrón — última semana" rows={lastWeek.byPattern} />
        <GroupBars title="Volumen por músculo — última semana" rows={lastWeek.byMuscle} />
      </div>
      <GroupBars title="Volumen por capacidad — última semana" rows={lastWeek.byCapacity} />

      {report.weeks.length > 1 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Últimas semanas
          </h3>
          <div className="border-border overflow-hidden rounded-xl border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Semana</th>
                  <th className="px-3 py-2 text-right font-medium">Sesiones</th>
                  <th className="px-3 py-2 text-right font-medium">Series</th>
                  <th className="px-3 py-2 text-right font-medium">RPE prom.</th>
                  <th className="px-3 py-2 text-right font-medium">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {[...report.weeks].reverse().map((w) => (
                  <tr key={w.weekStart}>
                    <td className="px-3 py-2">{fmtWeek(w.weekStart)}</td>
                    <td className="tnum px-3 py-2 text-right font-mono">{w.sessions}</td>
                    <td className="tnum px-3 py-2 text-right font-mono">{w.totalSeries}</td>
                    <td className="tnum px-3 py-2 text-right font-mono">{w.avgIntensity ?? '—'}</td>
                    <td className="tnum px-3 py-2 text-right font-mono">{w.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
