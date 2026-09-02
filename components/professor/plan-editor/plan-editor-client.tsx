'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DayEditor } from '@/components/professor/plan-editor/day-editor'
import { getRenewalBadge } from '@/lib/plan-renewal'
import type { PlanBuilderCatalog, PlanForEditor } from '@/lib/supabase/queries/plan-editor'
import { updatePlanDetails } from '@/app/planes/[planId]/actions'

const PLAN_TYPE_OPTIONS = [
  { value: 'MUSCLE', label: 'Músculo' },
  { value: 'PATTERN', label: 'Patrones' },
  { value: 'MIXED', label: 'Mixto' },
  { value: 'SPORT_SPECIFIC', label: 'Específico de deporte' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

export function PlanEditorClient({ plan, catalog }: { plan: PlanForEditor; catalog: PlanBuilderCatalog }) {
  const [activeDay, setActiveDay] = useState(plan.days[0]?.id ?? '')
  const badge = getRenewalBadge(plan.startDate, plan.endDate)

  return (
    <div className="flex flex-col gap-6">
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

      <div>
        <div className="mb-4 flex flex-wrap gap-1.5 border-b border-border pb-2">
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
        </div>

        {plan.days
          .filter((day) => day.id === activeDay)
          .map((day) => (
            <DayEditor key={day.id} day={day} planId={plan.id} planType={plan.planType} catalog={catalog} />
          ))}
      </div>
    </div>
  )
}
