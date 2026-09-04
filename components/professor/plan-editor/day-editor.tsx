'use client'

import { useMemo, useState, useTransition } from 'react'
import { Copy, Layers, Plus, Repeat, Save, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExerciseCombobox } from '@/components/professor/plan-editor/exercise-combobox'
import { calculateVolumeByGroup } from '@/lib/volume-calc'
import { blockHasRounds, type SaveDayBlockKind } from '@/lib/plan-blocks'
import type { PlanBuilderCatalog, PlanDay } from '@/lib/supabase/queries/plan-editor'
import { saveDay, type SaveDayBlockPayload } from '@/app/planes/[planId]/actions'

type DraftItem = {
  tempId: string
  exerciseId: string | null
  exerciseName: string
  patternOrMuscleId: string | null
  activityName: string
  label: string
  sets: string
  reps: string
  intensityRpe: string
  restLabel: string
  notes: string
}

type DraftBlock = {
  tempId: string
  kind: SaveDayBlockKind
  rounds: string
  items: DraftItem[]
}

let tempIdCounter = 0
const nextTempId = () => `tmp-${tempIdCounter++}`

function dayToDraft(day: PlanDay): DraftBlock[] {
  return day.blocks.map((block) => ({
    tempId: nextTempId(),
    kind: block.kind === 'COMBINADO' || block.kind === 'CIRCUITO' ? block.kind : 'INDIVIDUAL',
    rounds: block.rounds != null ? String(block.rounds) : '3',
    items: block.items.map((item) => ({
      tempId: nextTempId(),
      exerciseId: item.exerciseId,
      exerciseName: item.exerciseName ?? item.activityName ?? '',
      patternOrMuscleId: item.patternId ?? item.muscleId ?? null,
      activityName: item.exerciseId ? '' : (item.activityName ?? ''),
      label: item.label ?? '',
      sets: item.prescription?.sets ?? '',
      reps: item.prescription?.reps ?? '',
      intensityRpe: item.prescription?.intensityRpe ?? '',
      restLabel: item.prescription?.restLabel ?? '',
      notes: item.prescription?.notes ?? '',
    })),
  }))
}

function emptyItem(prefill?: Partial<DraftItem>): DraftItem {
  return {
    tempId: nextTempId(),
    exerciseId: null,
    exerciseName: '',
    patternOrMuscleId: null,
    activityName: '',
    label: '',
    sets: prefill?.sets ?? '',
    reps: prefill?.reps ?? '',
    intensityRpe: prefill?.intensityRpe ?? '',
    restLabel: '',
    notes: '',
  }
}

export function DayEditor({
  day,
  planId,
  planType,
  catalog,
}: {
  day: PlanDay
  planId: string
  planType: string
  catalog: PlanBuilderCatalog
}) {
  const [blocks, setBlocks] = useState<DraftBlock[]>(() => dayToDraft(day))
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const groupIdToName = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of catalog.patterns) map.set(p.id, p.name)
    for (const m of catalog.muscles) map.set(m.id, m.name)
    return map
  }, [catalog])

  const volumeRows = useMemo(() => {
    const inputs = blocks.flatMap((block) =>
      block.items.map((item) => ({
        groupId: item.patternOrMuscleId,
        groupName: item.patternOrMuscleId ? (groupIdToName.get(item.patternOrMuscleId) ?? null) : null,
        sets: blockHasRounds(block.kind) ? String(block.rounds) : item.sets,
        intensityRpe: item.intensityRpe,
      })),
    )
    return calculateVolumeByGroup(inputs)
  }, [blocks, groupIdToName])

  function lastItemAcrossDay(): DraftItem | null {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const items = blocks[i].items
      if (items.length > 0) return items[items.length - 1]
    }
    return null
  }

  function addIndividualBlock() {
    const prev = lastItemAcrossDay()
    setBlocks((prevBlocks) => [
      ...prevBlocks,
      { tempId: nextTempId(), kind: 'INDIVIDUAL', rounds: '', items: [emptyItem(prev ?? undefined)] },
    ])
  }

  function addCombinedBlock() {
    setBlocks((prevBlocks) => [
      ...prevBlocks,
      {
        tempId: nextTempId(),
        kind: 'COMBINADO',
        rounds: '3',
        items: [
          { ...emptyItem(), label: 'A1' },
          { ...emptyItem(), label: 'A2' },
        ],
      },
    ])
  }

  function addCircuitBlock() {
    setBlocks((prevBlocks) => [
      ...prevBlocks,
      {
        tempId: nextTempId(),
        kind: 'CIRCUITO',
        rounds: '4',
        items: [
          { ...emptyItem(), label: 'A1' },
          { ...emptyItem(), label: 'A2' },
          { ...emptyItem(), label: 'A3' },
          { ...emptyItem(), label: 'A4' },
        ],
      },
    ])
  }

  function duplicateBlock(blockTempId: string) {
    setBlocks((prevBlocks) => {
      const index = prevBlocks.findIndex((b) => b.tempId === blockTempId)
      if (index === -1) return prevBlocks
      const source = prevBlocks[index]
      const copy: DraftBlock = {
        ...source,
        tempId: nextTempId(),
        items: source.items.map((item) => ({ ...item, tempId: nextTempId() })),
      }
      return [...prevBlocks.slice(0, index + 1), copy, ...prevBlocks.slice(index + 1)]
    })
  }

  function duplicateItem(blockTempId: string, itemTempId: string) {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) => {
        if (block.tempId !== blockTempId) return block
        const index = block.items.findIndex((i) => i.tempId === itemTempId)
        if (index === -1) return block
        const copy: DraftItem = { ...block.items[index], tempId: nextTempId() }
        const items = [...block.items.slice(0, index + 1), copy, ...block.items.slice(index + 1)]
        // Reetiqueta A1/A2… si el bloque usa labels.
        const relabelled = blockHasRounds(block.kind)
          ? items.map((it, i) => ({ ...it, label: `A${i + 1}` }))
          : items
        return { ...block, items: relabelled }
      }),
    )
  }

  function addItemToBlock(blockTempId: string) {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) => {
        if (block.tempId !== blockTempId) return block
        const prev = block.items[block.items.length - 1]
        return {
          ...block,
          items: [...block.items, { ...emptyItem(prev), label: `A${block.items.length + 1}` }],
        }
      }),
    )
  }

  function removeItem(blockTempId: string, itemTempId: string) {
    setBlocks((prevBlocks) =>
      prevBlocks
        .map((block) =>
          block.tempId === blockTempId
            ? { ...block, items: block.items.filter((i) => i.tempId !== itemTempId) }
            : block,
        )
        .filter((block) => block.items.length > 0),
    )
  }

  function removeBlock(blockTempId: string) {
    setBlocks((prevBlocks) => prevBlocks.filter((b) => b.tempId !== blockTempId))
  }

  function updateItem(blockTempId: string, itemTempId: string, patch: Partial<DraftItem>) {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.tempId !== blockTempId
          ? block
          : {
              ...block,
              items: block.items.map((item) => (item.tempId === itemTempId ? { ...item, ...patch } : item)),
            },
      ),
    )
  }

  function updateRounds(blockTempId: string, rounds: string) {
    setBlocks((prevBlocks) => prevBlocks.map((b) => (b.tempId === blockTempId ? { ...b, rounds } : b)))
  }

  function handleSave() {
    setSaveError(null)
    const payload: SaveDayBlockPayload[] = blocks.map((block) => ({
      kind: block.kind,
      rounds: blockHasRounds(block.kind) ? parseInt(block.rounds, 10) || null : null,
      items: block.items
        .filter((item) => item.exerciseId || item.activityName.trim() || item.exerciseName.trim())
        .map((item) => ({
          exerciseId: item.exerciseId,
          activityName: item.exerciseId ? null : item.activityName || item.exerciseName,
          label: blockHasRounds(block.kind) ? item.label : null,
          sets: item.sets,
          reps: item.reps,
          intensityRpe: item.intensityRpe,
          restLabel: item.restLabel,
          notes: item.notes,
        })),
    }))

    startTransition(async () => {
      const result = await saveDay(day.id, planId, payload)
      if (result.error) {
        setSaveError(result.error)
      } else {
        setSavedAt(Date.now())
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {volumeRows.length > 0 ? (
        <div className="border-border bg-muted/30 flex flex-wrap gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs">
          <span className="text-muted-foreground font-medium tracking-wide uppercase">Volumen del día</span>
          {volumeRows.map((row) => (
            <span key={row.groupId} className="tnum">
              {row.groupName}: <strong>{row.series}</strong>
              {row.intensityAvg != null ? <span className="text-muted-foreground"> (RPE {row.intensityAvg})</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      {blocks.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm">
          Sin ejercicios todavía en este día.
        </p>
      ) : null}

      {blocks.map((block) => {
        const hasRounds = blockHasRounds(block.kind)
        return (
          <div
            key={block.tempId}
            className={
              hasRounds
                ? 'border-primary/30 ring-primary/15 rounded-xl border-l-4 py-3 pr-3 pl-4 ring-1'
                : 'border-border rounded-xl border p-3'
            }
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {hasRounds ? (
                <>
                  <Badge className="bg-primary/10 text-primary border-transparent">
                    {block.kind === 'CIRCUITO' ? (
                      <Repeat data-icon="inline-start" className="size-3" />
                    ) : (
                      <Layers data-icon="inline-start" className="size-3" />
                    )}
                    {block.kind === 'CIRCUITO' ? 'Bloque circuito' : 'Bloque combinado'}
                  </Badge>
                  <label className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Vueltas</span>
                    <Input
                      type="number"
                      min={1}
                      value={block.rounds}
                      onChange={(e) => updateRounds(block.tempId, e.target.value)}
                      className="h-7 w-16 text-center"
                    />
                  </label>
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Individual
                </Badge>
              )}
              <div className="ml-auto flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => duplicateBlock(block.tempId)}
                  aria-label="Duplicar bloque"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeBlock(block.tempId)}
                  aria-label="Quitar bloque"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {block.items.map((item) => (
                <div key={item.tempId} className="bg-secondary/30 flex flex-col gap-2 rounded-lg border border-border p-2.5">
                  <div className="flex items-start gap-2">
                    {hasRounds ? (
                      <span className="bg-primary/10 text-primary mt-0.5 flex h-7 w-8 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold">
                        {item.label}
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <ExerciseCombobox
                        catalog={catalog}
                        planType={planType}
                        value={{
                          patternOrMuscleId: item.patternOrMuscleId,
                          exerciseId: item.exerciseId,
                          exerciseName: item.exerciseName,
                        }}
                        onChange={(next) =>
                          updateItem(block.tempId, item.tempId, {
                            patternOrMuscleId: next.patternOrMuscleId,
                            exerciseId: next.exerciseId,
                            exerciseName: next.exerciseName,
                            activityName: next.exerciseId ? '' : next.exerciseName,
                          })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => duplicateItem(block.tempId, item.tempId)}
                      aria-label="Duplicar ejercicio"
                      className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    {!hasRounds || block.items.length > 2 ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(block.tempId, item.tempId)}
                        aria-label="Quitar ejercicio"
                        className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {!hasRounds ? (
                      <FreeTextField
                        label="Series"
                        value={item.sets}
                        onChange={(v) => updateItem(block.tempId, item.tempId, { sets: v })}
                      />
                    ) : null}
                    <FreeTextField
                      label="Reps"
                      value={item.reps}
                      onChange={(v) => updateItem(block.tempId, item.tempId, { reps: v })}
                    />
                    <FreeTextField
                      label="Intensidad"
                      value={item.intensityRpe}
                      onChange={(v) => updateItem(block.tempId, item.tempId, { intensityRpe: v })}
                    />
                    <FreeTextField
                      label="Pausa"
                      value={item.restLabel}
                      onChange={(v) => updateItem(block.tempId, item.tempId, { restLabel: v })}
                    />
                  </div>
                  <FreeTextField
                    label="Notas"
                    value={item.notes}
                    onChange={(v) => updateItem(block.tempId, item.tempId, { notes: v })}
                  />
                </div>
              ))}
            </div>

            {hasRounds ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addItemToBlock(block.tempId)}
                className="text-muted-foreground hover:text-foreground mt-2 w-full border border-dashed border-border"
              >
                <Plus data-icon="inline-start" />
                Añadir ejercicio al bloque
              </Button>
            ) : null}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={addIndividualBlock}>
          <Plus data-icon="inline-start" />
          Ejercicio individual
        </Button>
        <Button variant="outline" size="sm" onClick={addCombinedBlock}>
          <Layers data-icon="inline-start" />
          Bloque combinado
        </Button>
        <Button variant="outline" size="sm" onClick={addCircuitBlock}>
          <Repeat data-icon="inline-start" />
          Bloque circuito
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {saveError ? <span className="text-destructive text-xs">{saveError}</span> : null}
          {savedAt ? <span className="text-primary text-xs">Guardado ✓</span> : null}
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            <Save data-icon="inline-start" />
            {isPending ? 'Guardando…' : 'Guardar día'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FreeTextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-sm" />
    </label>
  )
}
