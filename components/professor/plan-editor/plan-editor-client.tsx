'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DayEditor } from '@/components/professor/plan-editor/day-editor'
import { getRenewalBadge } from '@/lib/plan-renewal'
import type { PlanBuilderCatalog, PlanForEditor } from '@/lib/supabase/queries/plan-editor'
import {
  addDay,
  addWeek,
  deleteDay,
  deleteWeek,
  duplicateDay,
  duplicateWeek,
  renameDay,
  updatePlanDetails,
} from '@/app/planes/[planId]/actions'

const PLAN_TYPE_OPTIONS = [
  { value: 'MUSCLE', label: 'Músculo' },
  { value: 'PATTERN', label: 'Patrones' },
  { value: 'MIXED', label: 'Mixto' },
  { value: 'SPORT_SPECIFIC', label: 'Específico de deporte' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

function weekLabel(week: { number: number; name: string | null }): string {
  return week.name?.trim() || `Semana ${week.number}`
}

export function PlanEditorClient({ plan, catalog }: { plan: PlanForEditor; catalog: PlanBuilderCatalog }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [twoUp, setTwoUp] = useState(false)
  const [activeDay, setActiveDay] = useState(plan.days[0]?.id ?? '')
  const [activeDay2, setActiveDay2] = useState(plan.days[1]?.id ?? plan.days[0]?.id ?? '')
  const [dayName, setDayName] = useState('')
  const [dayError, setDayError] = useState<string | null>(null)

  const badge = getRenewalBadge(plan.startDate, plan.endDate)

  // Si la lista de días cambió (añadir/eliminar/duplicar recargó los props),
  // reencauzar las selecciones a algo que siga existiendo.
  useEffect(() => {
    if (!plan.days.some((d) => d.id === activeDay)) setActiveDay(plan.days[0]?.id ?? '')
    if (!plan.days.some((d) => d.id === activeDay2)) setActiveDay2(plan.days[1]?.id ?? plan.days[0]?.id ?? '')
  }, [plan.days, activeDay, activeDay2])

  const currentDay = plan.days.find((d) => d.id === activeDay) ?? null
  useEffect(() => setDayName(currentDay?.name ?? ''), [currentDay?.id, currentDay?.name])

  function runDayAction(fn: () => Promise<{ error: string | null }>) {
    setDayError(null)
    startTransition(async () => {
      const result = await fn()
      if (result.error) setDayError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Datos generales del plan */}
      <div className="border-border bg-card rounded-xl border p-4">
        <form action={updatePlanDetails} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="flex min-w-48 flex-1 flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Nombre del plan</span>
            <Input name="name" defaultValue={plan.name} required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Tipo</span>
            <select
              name="planType"
              defaultValue={plan.planType}
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            >
              {PLAN_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Inicio</span>
            <Input type="date" name="startDate" defaultValue={plan.startDate ?? ''} className="h-8" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Fin (opcional)</span>
            <Input type="date" name="endDate" defaultValue={plan.endDate ?? ''} className="h-8" />
          </label>
          {badge ? (
            <span
              className={
                badge.tone === 'critical'
                  ? 'bg-destructive/10 text-destructive rounded-full px-2.5 py-1 text-xs'
                  : 'bg-warning/15 text-warning-foreground rounded-full px-2.5 py-1 text-xs'
              }
            >
              {badge.label}
            </span>
          ) : null}
          <Button type="submit" variant="outline" className="h-8">
            <Save data-icon="inline-start" />
            Guardar datos
          </Button>
        </form>
      </div>

      {/* Semana */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs font-medium">Semana</span>
          <select
            value={plan.weekId}
            onChange={(e) => router.push(`/planes/${plan.id}?week=${e.target.value}`)}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            disabled={plan.weeks.length === 0}
          >
            {plan.weeks.map((week) => (
              <option key={week.id} value={week.id}>
                {weekLabel(week)}
              </option>
            ))}
          </select>
        </label>

        <form action={addWeek}>
          <input type="hidden" name="planId" value={plan.id} />
          <Button type="submit" variant="outline" size="sm">
            <Plus data-icon="inline-start" />
            Añadir semana
          </Button>
        </form>

        {plan.weekId ? (
          <form action={duplicateWeek}>
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="sourceWeekId" value={plan.weekId} />
            <Button type="submit" variant="outline" size="sm">
              <Copy data-icon="inline-start" />
              Duplicar semana
            </Button>
          </form>
        ) : null}

        {plan.weeks.length > 1 ? (
          <form
            action={deleteWeek}
            onSubmit={(e) => {
              if (!confirm('¿Eliminar esta semana y todos sus días?')) e.preventDefault()
            }}
          >
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="weekId" value={plan.weekId} />
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <Trash2 data-icon="inline-start" />
              Eliminar semana
            </Button>
          </form>
        ) : null}
      </div>

      {plan.weeks.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm">
          Este plan todavía no tiene semanas.
        </p>
      ) : (
        <div>
          {/* Tabs de día + toggle de vista */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
            {plan.days.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => setActiveDay(day.id)}
                className={
                  day.id === activeDay
                    ? 'bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-sm font-medium'
                    : 'text-muted-foreground hover:bg-muted rounded-full px-3 py-1.5 text-sm font-medium'
                }
              >
                {day.name}
              </button>
            ))}

            <form action={addDay} className="inline-flex">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="weekId" value={plan.weekId} />
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                <Plus data-icon="inline-start" />
                Día
              </Button>
            </form>

            {plan.days.length > 1 ? (
              <div className="ml-auto flex overflow-hidden rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setTwoUp(false)}
                  className={twoUp ? 'px-2.5 py-1 text-muted-foreground' : 'bg-muted px-2.5 py-1 font-medium'}
                >
                  1 día
                </button>
                <button
                  type="button"
                  onClick={() => setTwoUp(true)}
                  className={twoUp ? 'bg-muted px-2.5 py-1 font-medium' : 'px-2.5 py-1 text-muted-foreground'}
                >
                  2 días
                </button>
              </div>
            ) : null}
          </div>

          {/* Estructura del día activo: renombrar / duplicar / eliminar */}
          {currentDay ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Input
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                onBlur={() => {
                  if (dayName.trim() && dayName !== currentDay.name)
                    runDayAction(() => renameDay(plan.id, currentDay.id, dayName))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                className="h-8 w-48"
                aria-label="Nombre del día"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => runDayAction(() => duplicateDay(plan.id, currentDay.id))}
              >
                <Copy data-icon="inline-start" />
                Duplicar día
              </Button>
              {plan.days.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${currentDay.name}" y todo su contenido?`))
                      runDayAction(() => deleteDay(plan.id, currentDay.id))
                  }}
                >
                  <Trash2 data-icon="inline-start" />
                  Eliminar día
                </Button>
              ) : null}
              {dayError ? <span className="text-destructive text-xs">{dayError}</span> : null}
            </div>
          ) : null}

          {plan.days.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm">
              Esta semana no tiene días. Añadí uno para empezar.
            </p>
          ) : twoUp && plan.days.length > 1 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                { id: activeDay, set: setActiveDay },
                { id: activeDay2, set: setActiveDay2 },
              ].map((slot, i) => {
                const day = plan.days.find((d) => d.id === slot.id)
                return (
                  <div key={i} className="border-border rounded-xl border p-3">
                    <select
                      value={slot.id}
                      onChange={(e) => slot.set(e.target.value)}
                      className="border-input mb-3 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
                    >
                      {plan.days.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {day ? (
                      <DayEditor
                        key={day.id}
                        day={day}
                        planId={plan.id}
                        planType={plan.planType}
                        catalog={catalog}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : currentDay ? (
            <DayEditor
              key={currentDay.id}
              day={currentDay}
              planId={plan.id}
              planType={plan.planType}
              catalog={catalog}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
