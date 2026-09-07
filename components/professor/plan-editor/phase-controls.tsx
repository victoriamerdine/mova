'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PHASE_KIND_OPTIONS } from '@/lib/plan-phases'
import type { PlanPhaseOption, PlanWeekOption } from '@/lib/supabase/queries/plan-editor'
import { addPhase, deletePhase, setWeekPhase, updatePhase } from '@/app/planes/[planId]/actions'

/**
 * Fases del plan (nivel opcional Plan → Fase → Semana). Deja asignar la
 * semana activa a una fase y, en un panel desplegable, gestionar la lista
 * de fases del plan (agregar, renombrar, cambiar tipo, borrar). Un plan
 * puede no usar fases: en ese caso solo se ve el botón "Añadir fase".
 */
export function PhaseControls({
  planId,
  phases,
  weeks,
  activeWeek,
}: {
  planId: string
  phases: PlanPhaseOption[]
  weeks: PlanWeekOption[]
  activeWeek: PlanWeekOption | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)

  function run(fn: () => Promise<{ error: string | null }>) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const weekCountByPhase = new Map<string, number>()
  for (const w of weeks) {
    if (w.phaseId) weekCountByPhase.set(w.phaseId, (weekCountByPhase.get(w.phaseId) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {activeWeek ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs font-medium">Fase</span>
            <select
              value={activeWeek.phaseId ?? ''}
              disabled={pending}
              onChange={(e) =>
                run(() => setWeekPhase(planId, activeWeek.id, e.target.value || null))
              }
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            >
              <option value="">Sin fase</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={() => setManageOpen((v) => !v)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
        >
          <ChevronDown className={`size-3 transition-transform ${manageOpen ? 'rotate-180' : ''}`} />
          Gestionar fases{phases.length > 0 ? ` (${phases.length})` : ''}
        </button>

        {error ? <span className="text-destructive text-xs">{error}</span> : null}
      </div>

      {manageOpen ? (
        <div className="border-border bg-muted/20 flex flex-col gap-2 rounded-lg border p-3">
          {phases.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Este plan no usa fases. Agregá una para agrupar semanas (preparación, competencia, etc.).
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {phases.map((phase) => (
                <li key={phase.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    defaultValue={phase.name}
                    disabled={pending}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value.trim() !== phase.name)
                        run(() => updatePhase(planId, phase.id, { name: e.target.value }))
                    }}
                    className="h-8 w-44"
                    aria-label={`Nombre de la fase ${phase.name}`}
                  />
                  <select
                    value={phase.kind ?? 'custom'}
                    disabled={pending}
                    onChange={(e) => run(() => updatePhase(planId, phase.id, { kind: e.target.value }))}
                    className="border-input h-8 rounded-lg border bg-transparent px-2 text-xs outline-none dark:bg-input/30"
                    aria-label={`Tipo de la fase ${phase.name}`}
                  >
                    {PHASE_KIND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted-foreground text-xs tnum">
                    {weekCountByPhase.get(phase.id) ?? 0} sem.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label={`Eliminar fase ${phase.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`¿Eliminar la fase "${phase.name}"? Las semanas quedan sin fase.`))
                        run(() => deletePhase(planId, phase.id))
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form action={addPhase} className="mt-1">
            <input type="hidden" name="planId" value={planId} />
            <input type="hidden" name="weekId" value={activeWeek?.id ?? ''} />
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              <Plus data-icon="inline-start" />
              Añadir fase
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
