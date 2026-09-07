'use client'

import { useCallback, useEffect, useMemo, useState, useTransition, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DayEditor } from '@/components/professor/plan-editor/day-editor'
import {
  EXERCISE_DRAG_TYPE,
  dayToDraft,
  draftToPayload,
  emptyItem,
  nextTempId,
  type DraftBlock,
} from '@/components/professor/plan-editor/draft'
import {
  ExerciseLibraryPanel,
  type LibraryDragPayload,
} from '@/components/professor/plan-editor/exercise-library-panel'
import { LoadPanel } from '@/components/professor/plan-editor/load-panel'
import { PhaseControls } from '@/components/professor/plan-editor/phase-controls'
import { blockHasRounds } from '@/lib/plan-blocks'
import { getRenewalBadge } from '@/lib/plan-renewal'
import { calculateVolumeByGroup, type VolumeInput } from '@/lib/volume-calc'
import type { LoadTarget, PlanBuilderCatalog, PlanForEditor } from '@/lib/supabase/queries/plan-editor'
import {
  addDay,
  addWeek,
  deleteDay,
  deleteWeek,
  duplicateDay,
  duplicateWeek,
  renameDay,
  savePlanDays,
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

const DISCARD_MSG = 'Tenés cambios sin guardar en los días. Si seguís, se pierden. ¿Continuar?'

export function PlanEditorClient({
  plan,
  catalog,
  loadTargets,
}: {
  plan: PlanForEditor
  catalog: PlanBuilderCatalog
  loadTargets: LoadTarget[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [twoUp, setTwoUp] = useState(false)
  const [activeDay, setActiveDay] = useState(plan.days[0]?.id ?? '')
  const [activeDay2, setActiveDay2] = useState(plan.days[1]?.id ?? plan.days[0]?.id ?? '')
  const [dayName, setDayName] = useState('')
  const [dayError, setDayError] = useState<string | null>(null)

  // Draft de TODOS los días de la semana cargada — navegar entre días no
  // pierde lo cargado, y "Guardar plan" persiste todo junto (atómico).
  const [draftsByDay, setDraftsByDay] = useState<Record<string, DraftBlock[]>>(() =>
    Object.fromEntries(plan.days.map((d) => [d.id, dayToDraft(d)])),
  )
  const [dirty, setDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, startSaving] = useTransition()

  const badge = getRenewalBadge(plan.startDate, plan.endDate)

  // `plan` (y por lo tanto `plan.days`) solo cambia de identidad cuando el
  // Server Component vuelve a correr, o sea después de un router.refresh()
  // de una operación estructural (añadir/duplicar/eliminar día o semana).
  // Ahí: se conservan los drafts en memoria de los días que siguen
  // existiendo, y se deriva uno fresco para los nuevos.
  useEffect(() => {
    setDraftsByDay((prev) =>
      Object.fromEntries(plan.days.map((d) => [d.id, prev[d.id] ?? dayToDraft(d)])),
    )
  }, [plan.days])

  // Si la lista de días cambió, reencauzar las selecciones.
  useEffect(() => {
    if (!plan.days.some((d) => d.id === activeDay)) setActiveDay(plan.days[0]?.id ?? '')
    if (!plan.days.some((d) => d.id === activeDay2)) setActiveDay2(plan.days[1]?.id ?? plan.days[0]?.id ?? '')
  }, [plan.days, activeDay, activeDay2])

  const currentDay = plan.days.find((d) => d.id === activeDay) ?? null
  useEffect(() => setDayName(currentDay?.name ?? ''), [currentDay?.id, currentDay?.name])

  // Aviso nativo del navegador al cerrar/recargar con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const setDayDraft = useCallback(
    (dayId: string) => (updater: (prev: DraftBlock[]) => DraftBlock[]) => {
      setDraftsByDay((prev) => ({ ...prev, [dayId]: updater(prev[dayId] ?? []) }))
      setDirty(true)
    },
    [],
  )

  const [dragOverDay, setDragOverDay] = useState<string | null>(null)

  // Agrega un bloque INDIVIDUAL con el ejercicio ya puesto al final del día
  // (desde el panel de biblioteca: ＋ o arrastrar y soltar).
  const addExerciseToDay = useCallback(
    (dayId: string, ex: LibraryDragPayload) => {
      const cat = catalog.exercises.find((c) => c.id === ex.id)
      const patternOrMuscleId =
        plan.planType === 'PATTERN' ? (cat?.patternId ?? null) : (cat?.muscleId ?? null)
      setDayDraft(dayId)((prev) => [
        ...prev,
        {
          tempId: nextTempId(),
          kind: 'INDIVIDUAL',
          rounds: '',
          items: [{ ...emptyItem(), exerciseId: ex.id, exerciseName: ex.name, patternOrMuscleId }],
        },
      ])
    },
    [catalog.exercises, plan.planType, setDayDraft],
  )

  function dropHandlers(dayId: string) {
    return {
      onDragOver: (e: DragEvent) => {
        if (e.dataTransfer.types.includes(EXERCISE_DRAG_TYPE)) {
          e.preventDefault()
          setDragOverDay(dayId)
        }
      },
      onDragLeave: () => setDragOverDay((d) => (d === dayId ? null : d)),
      onDrop: (e: DragEvent) => {
        const raw = e.dataTransfer.getData(EXERCISE_DRAG_TYPE)
        setDragOverDay(null)
        if (!raw) return
        e.preventDefault()
        try {
          addExerciseToDay(dayId, JSON.parse(raw) as LibraryDragPayload)
        } catch {
          /* payload inválido, ignorar */
        }
      },
    }
  }

  // Solo las operaciones de SEMANA (navegar/añadir/duplicar/eliminar
  // semana) tiran los drafts en memoria — recargan el Server Component con
  // otra lista de días. Las de DÍA los conservan (ver el efecto de merge de
  // arriba), así que no hace falta avisar ahí.
  function confirmDiscardWeek(): boolean {
    return !dirty || confirm(DISCARD_MSG)
  }

  function runDayAction(fn: () => Promise<{ error: string | null }>) {
    setDayError(null)
    startTransition(async () => {
      const result = await fn()
      if (result.error) setDayError(result.error)
      else router.refresh()
    })
  }

  function handleSavePlan() {
    setSaveError(null)
    const days = plan.days.map((d) => ({
      workoutId: d.id,
      blocks: draftToPayload(draftsByDay[d.id] ?? []),
    }))
    startSaving(async () => {
      const result = await savePlanDays(plan.id, days)
      if (result.error) setSaveError(result.error)
      else {
        setDirty(false)
        setSavedAt(Date.now())
      }
    })
  }

  const twoUpSlots = useMemo(
    () => [
      { id: activeDay, set: setActiveDay },
      { id: activeDay2, set: setActiveDay2 },
    ],
    [activeDay, activeDay2],
  )

  // Objetivos de carga del alumno, indexados por patrón/músculo.
  const targetsById = useMemo(() => {
    const m = new Map<string, LoadTarget>()
    for (const t of loadTargets) m.set(t.groupId, t)
    return m
  }, [loadTargets])

  const groupIdToName = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of catalog.patterns) m.set(p.id, p.name)
    for (const m2 of catalog.muscles) m.set(m2.id, m2.name)
    return m
  }, [catalog])

  const blocksToVolumeInputs = useCallback(
    (blocks: DraftBlock[]): VolumeInput[] =>
      blocks.flatMap((block) =>
        block.items.map((item) => ({
          groupId: item.patternOrMuscleId,
          groupName: item.patternOrMuscleId ? (groupIdToName.get(item.patternOrMuscleId) ?? null) : null,
          sets: blockHasRounds(block.kind) ? String(block.rounds) : item.sets,
          intensityRpe: item.intensityRpe,
        })),
      ),
    [groupIdToName],
  )

  const weeklyVolume = useMemo(
    () => calculateVolumeByGroup(plan.days.flatMap((d) => blocksToVolumeInputs(draftsByDay[d.id] ?? []))),
    [plan.days, draftsByDay, blocksToVolumeInputs],
  )
  const activeDayVolume = useMemo(
    () => calculateVolumeByGroup(blocksToVolumeInputs(draftsByDay[activeDay] ?? [])),
    [draftsByDay, activeDay, blocksToVolumeInputs],
  )

  const showLibrary = plan.weeks.length > 0 && plan.days.length > 0

  return (
    <div
      className={
        showLibrary
          ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-6'
          : undefined
      }
    >
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
            onChange={(e) => {
              if (confirmDiscardWeek()) router.push(`/planes/${plan.id}?week=${e.target.value}`)
            }}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            disabled={plan.weeks.length === 0}
          >
            {plan.phases.length === 0
              ? plan.weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    {weekLabel(week)}
                  </option>
                ))
              : [
                  ...plan.phases.map((phase) => {
                    const phaseWeeks = plan.weeks.filter((w) => w.phaseId === phase.id)
                    if (phaseWeeks.length === 0) return null
                    return (
                      <optgroup key={phase.id} label={phase.name}>
                        {phaseWeeks.map((week) => (
                          <option key={week.id} value={week.id}>
                            {weekLabel(week)}
                          </option>
                        ))}
                      </optgroup>
                    )
                  }),
                  (() => {
                    const noPhase = plan.weeks.filter((w) => !w.phaseId)
                    if (noPhase.length === 0) return null
                    return (
                      <optgroup key="__none" label="Sin fase">
                        {noPhase.map((week) => (
                          <option key={week.id} value={week.id}>
                            {weekLabel(week)}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })(),
                ]}
          </select>
        </label>

        <form action={addWeek} onSubmit={(e) => !confirmDiscardWeek() && e.preventDefault()}>
          <input type="hidden" name="planId" value={plan.id} />
          <Button type="submit" variant="outline" size="sm">
            <Plus data-icon="inline-start" />
            Añadir semana
          </Button>
        </form>

        {plan.weekId ? (
          <form action={duplicateWeek} onSubmit={(e) => !confirmDiscardWeek() && e.preventDefault()}>
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
              if (!confirmDiscardWeek() || !confirm('¿Eliminar esta semana y todos sus días?')) e.preventDefault()
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

      {plan.weeks.length > 0 ? (
        <PhaseControls
          planId={plan.id}
          phases={plan.phases}
          weeks={plan.weeks}
          activeWeek={plan.weeks.find((w) => w.id === plan.weekId) ?? null}
        />
      ) : null}

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

            <form
              action={addDay}
              className="inline-flex"
              onSubmit={(e) => !confirmDiscardWeek() && e.preventDefault()}
            >
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

          {/* Guardar plan (todos los días de la semana, junto) */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {dirty ? (
              <span className="text-warning-foreground text-xs font-medium">● Cambios sin guardar</span>
            ) : savedAt ? (
              <span className="text-primary text-xs">Guardado ✓</span>
            ) : null}
            {saveError ? <span className="text-destructive text-xs">{saveError}</span> : null}
            <Button size="sm" onClick={handleSavePlan} disabled={saving || !dirty} className="ml-auto">
              <Save data-icon="inline-start" />
              {saving ? 'Guardando…' : 'Guardar plan'}
            </Button>
          </div>

          <LoadPanel
            weekly={weeklyVolume}
            day={activeDayVolume}
            targets={targetsById}
            dayCount={plan.days.length}
          />

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
              {twoUpSlots.map((slot, i) => {
                const day = plan.days.find((d) => d.id === slot.id)
                return (
                  <div
                    key={i}
                    {...(day ? dropHandlers(day.id) : {})}
                    className={
                      day && dragOverDay === day.id
                        ? 'ring-primary/50 rounded-xl border border-border p-3 ring-2 ring-dashed'
                        : 'border-border rounded-xl border p-3'
                    }
                  >
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
                        blocks={draftsByDay[day.id] ?? []}
                        onBlocksChange={setDayDraft(day.id)}
                        planType={plan.planType}
                        catalog={catalog}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : currentDay ? (
            <div
              {...dropHandlers(currentDay.id)}
              className={
                dragOverDay === currentDay.id
                  ? 'ring-primary/50 rounded-xl p-1 ring-2 ring-dashed'
                  : undefined
              }
            >
              <DayEditor
                key={currentDay.id}
                blocks={draftsByDay[currentDay.id] ?? []}
                onBlocksChange={setDayDraft(currentDay.id)}
                planType={plan.planType}
                catalog={catalog}
              />
            </div>
          ) : null}
        </div>
      )}
      </div>

      {showLibrary ? (
        <ExerciseLibraryPanel
          exercises={catalog.exercises}
          onAdd={(ex) => addExerciseToDay(activeDay, ex)}
        />
      ) : null}
    </div>
  )
}
