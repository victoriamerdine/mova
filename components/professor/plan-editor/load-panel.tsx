'use client'

import { cn } from '@/lib/utils'
import type { VolumeRow } from '@/lib/volume-calc'
import type { LoadTarget } from '@/lib/supabase/queries/plan-editor'

type Tone = 'ok' | 'over' | 'none'

function tone(value: number, target: number | null): Tone {
  if (target == null) return 'none'
  return value > target ? 'over' : 'ok'
}

const toneText: Record<Tone, string> = {
  ok: 'text-primary',
  over: 'text-destructive font-semibold',
  none: 'text-muted-foreground',
}
const toneBar: Record<Tone, string> = {
  ok: 'bg-primary',
  over: 'bg-destructive',
  none: 'bg-muted-foreground/40',
}

function Bar({ value, target, max }: { value: number; target: number | null; max: number }) {
  const t = tone(value, target)
  return (
    <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
      <div
        className={cn('absolute inset-y-0 left-0 rounded-full transition-all', toneBar[t])}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
      {target != null ? (
        <div
          aria-hidden
          className="bg-foreground/40 absolute inset-y-0 w-0.5"
          style={{ left: `${Math.min(100, (target / max) * 100)}%` }}
        />
      ) : null}
    </div>
  )
}

export function LoadPanel({
  weekly,
  day,
  targets,
  dayCount,
}: {
  weekly: VolumeRow[]
  day: VolumeRow[]
  targets: Map<string, LoadTarget>
  dayCount: number
}) {
  const anyWeekly = weekly.some((r) => r.series > 0)
  if (!anyWeekly) return null

  const maxWeekly = Math.max(
    4,
    ...weekly.map((r) => r.series),
    ...weekly.map((r) => targets.get(r.groupId)?.weeklySeries ?? 0),
  )

  const dayById = new Map(day.map((r) => [r.groupId, r]))

  return (
    <div className="border-border bg-muted/20 mb-4 grid gap-4 rounded-xl border p-3 sm:grid-cols-2">
      <section className="flex flex-col gap-2.5">
        <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Volumen semanal por patrón
        </h3>
        {weekly
          .filter((r) => r.series > 0 || targets.get(r.groupId)?.weeklySeries != null)
          .map((r) => {
            const target = targets.get(r.groupId)?.weeklySeries ?? null
            const t = tone(r.series, target)
            return (
              <div key={r.groupId} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">{r.groupName}</span>
                  <span className={cn('tnum shrink-0 font-mono', toneText[t])}>
                    {r.series}
                    {target != null ? <span className="text-muted-foreground"> / {target}</span> : null}
                  </span>
                </div>
                <Bar value={r.series} target={target} max={maxWeekly} />
              </div>
            )
          })}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Volumen / intensidad — este día
        </h3>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs">
          <span />
          <span className="text-muted-foreground text-right text-[10px] uppercase">Vol</span>
          <span className="text-muted-foreground text-right text-[10px] uppercase">RPE</span>
          {day
            .filter((r) => r.series > 0 || r.intensityAvg != null)
            .map((r) => {
              const tgt = targets.get(r.groupId)
              const dayBudget = tgt?.weeklySeries != null && dayCount > 0 ? tgt.weeklySeries / dayCount : null
              const volTone = tone(r.series, dayBudget)
              const rpeTone = tone(r.intensityAvg ?? 0, tgt?.intensity ?? null)
              return (
                <div key={r.groupId} className="col-span-3 grid grid-cols-[1fr_auto_auto] gap-x-3">
                  <span className="truncate">{r.groupName}</span>
                  <span className={cn('tnum text-right font-mono', toneText[volTone])}>{r.series}</span>
                  <span className={cn('tnum text-right font-mono', toneText[rpeTone])}>
                    {r.intensityAvg ?? '—'}
                  </span>
                </div>
              )
            })}
        </div>
      </section>
    </div>
  )
}
