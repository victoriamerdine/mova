'use client'

import { useMemo, useState, type DragEvent } from 'react'
import { ChevronDown, Copy, GripVertical, Layers, Plus, Repeat, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ExerciseCombobox } from '@/components/professor/plan-editor/exercise-combobox'
import { ExerciseVideoPreview } from '@/components/professor/plan-editor/exercise-video-preview'
import {
  EXERCISE_DRAG_TYPE,
  ITEM_DRAG_TYPE,
  emptyItem,
  nextTempId,
  normalizeText,
  type DraftBlock,
  type DraftItem,
} from '@/components/professor/plan-editor/draft'
import { calculateVolumeByGroup } from '@/lib/volume-calc'
import {
  BLOCK_KIND_LABEL,
  NON_ROUNDS_BLOCK_KINDS,
  SECTION_BLOCK_KINDS,
  blockHasRounds,
  type SaveDayBlockKind,
} from '@/lib/plan-blocks'
import type { PlanBuilderCatalog } from '@/lib/supabase/queries/plan-editor'

/**
 * Editor de UN día. Es controlado: los bloques viven en PlanEditorClient
 * (`blocks` + `onBlocksChange`) para que navegar entre días no pierda lo
 * cargado. No guarda nada por su cuenta — el guardado es único, en
 * PlanEditorClient ("Guardar plan").
 */
export function DayEditor({
  blocks,
  onBlocksChange,
  planType,
  catalog,
}: {
  blocks: DraftBlock[]
  onBlocksChange: (updater: (prev: DraftBlock[]) => DraftBlock[]) => void
  planType: string
  catalog: PlanBuilderCatalog
}) {
  const setBlocks = onBlocksChange

  const groupIdToName = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of catalog.patterns) map.set(p.id, p.name)
    for (const m of catalog.muscles) map.set(m.id, m.name)
    return map
  }, [catalog])

  const videoIdByExercise = useMemo(() => {
    const map = new Map<string, string>()
    for (const ex of catalog.exercises) if (ex.videoId) map.set(ex.id, ex.videoId)
    return map
  }, [catalog])

  // Campos de resistencia/actividad (distancia, tiempo, ritmo, tempo, carga %)
  // ocultos por defecto; se abren por ítem, y arrancan abiertos si ya traen
  // algo cargado. DayEditor se remonta al cambiar de día (key), así que el
  // estado inicial se recalcula por día.
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set(blocks.flatMap((b) => b.items).filter(hasEnduranceFields).map((i) => i.tempId)),
  )
  const toggleExpanded = (tempId: string) =>
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(tempId)) next.delete(tempId)
      else next.add(tempId)
      return next
    })

  // ---- Drag & drop de ítems: reordenar y mover entre bloques ----
  // `dropHint` = dónde caería lo que se está arrastrando:
  //   { blockTempId, itemTempId }        → justo antes de ese ítem
  //   { blockTempId, itemTempId: null }  → al final de ese bloque
  const [dropHint, setDropHint] = useState<{ blockTempId: string; itemTempId: string | null } | null>(
    null,
  )

  function dragTypesInclude(e: DragEvent) {
    return (
      e.dataTransfer.types.includes(ITEM_DRAG_TYPE) ||
      e.dataTransfer.types.includes(EXERCISE_DRAG_TYPE)
    )
  }

  function relabel(block: DraftBlock): DraftBlock {
    if (blockHasRounds(block.kind)) {
      return { ...block, items: block.items.map((it, i) => ({ ...it, label: `A${i + 1}` })) }
    }
    return { ...block, items: block.items.map((it) => (it.label ? { ...it, label: '' } : it)) }
  }

  function insertInto(
    prevBlocks: DraftBlock[],
    item: DraftItem,
    toBlockTempId: string,
    beforeItemTempId: string | null,
  ): DraftBlock[] {
    return prevBlocks.map((block) => {
      if (block.tempId !== toBlockTempId) return block
      const items = [...block.items]
      const idx = beforeItemTempId ? items.findIndex((i) => i.tempId === beforeItemTempId) : -1
      items.splice(idx === -1 ? items.length : idx, 0, item)
      return relabel({ ...block, items })
    })
  }

  function moveItem(
    fromBlockTempId: string,
    fromItemTempId: string,
    toBlockTempId: string,
    beforeItemTempId: string | null,
  ) {
    if (fromBlockTempId === toBlockTempId && fromItemTempId === beforeItemTempId) return
    setBlocks((prevBlocks) => {
      const moving = prevBlocks
        .find((b) => b.tempId === fromBlockTempId)
        ?.items.find((i) => i.tempId === fromItemTempId)
      if (!moving) return prevBlocks
      const without = prevBlocks.map((b) =>
        b.tempId === fromBlockTempId
          ? relabel({ ...b, items: b.items.filter((i) => i.tempId !== fromItemTempId) })
          : b,
      )
      const placed = insertInto(without, { ...moving }, toBlockTempId, beforeItemTempId)
      return placed.filter((b) => b.items.length > 0)
    })
  }

  function libraryItem(ex: { id: string; name: string }): DraftItem {
    const cat = catalog.exercises.find((c) => c.id === ex.id)
    const patternOrMuscleId =
      planType === 'PATTERN' ? (cat?.patternId ?? null) : (cat?.muscleId ?? null)
    const groupLabel = patternOrMuscleId ? (groupIdToName.get(patternOrMuscleId) ?? '') : ''
    return { ...emptyItem(), exerciseId: ex.id, exerciseName: ex.name, patternOrMuscleId, groupLabel }
  }

  function handleDropInto(e: DragEvent, toBlockTempId: string, beforeItemTempId: string | null) {
    const itemRaw = e.dataTransfer.getData(ITEM_DRAG_TYPE)
    if (itemRaw) {
      try {
        const { blockTempId, itemTempId } = JSON.parse(itemRaw) as {
          blockTempId: string
          itemTempId: string
        }
        moveItem(blockTempId, itemTempId, toBlockTempId, beforeItemTempId)
      } catch {
        /* payload inválido */
      }
      return
    }
    const exRaw = e.dataTransfer.getData(EXERCISE_DRAG_TYPE)
    if (exRaw) {
      try {
        const ex = JSON.parse(exRaw) as { id: string; name: string }
        setBlocks((prev) => insertInto(prev, libraryItem(ex), toBlockTempId, beforeItemTempId))
      } catch {
        /* payload inválido */
      }
    }
  }

  const volumeRows = useMemo(() => {
    const inputs = blocks.flatMap((block) =>
      block.items.map((item) => {
        const label = item.groupLabel.trim()
        return {
          groupId: label ? normalizeText(label) : null,
          groupName: label || null,
          sets: blockHasRounds(block.kind) ? String(block.rounds) : item.sets,
          intensityRpe: item.intensityRpe,
        }
      }),
    )
    return calculateVolumeByGroup(inputs)
  }, [blocks])

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

  function addSectionBlock(kind: SaveDayBlockKind) {
    setBlocks((prevBlocks) => [
      ...prevBlocks,
      { tempId: nextTempId(), kind, rounds: '', items: [emptyItem()] },
    ])
  }

  function updateBlockKind(blockTempId: string, kind: SaveDayBlockKind) {
    setBlocks((prevBlocks) => prevBlocks.map((b) => (b.tempId === blockTempId ? { ...b, kind } : b)))
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
        const blockDropActive = dropHint?.blockTempId === block.tempId && dropHint.itemTempId === null
        return (
          <div
            key={block.tempId}
            onDragOver={(e) => {
              if (!dragTypesInclude(e)) return
              e.preventDefault()
              e.stopPropagation()
              setDropHint({ blockTempId: block.tempId, itemTempId: null })
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return
              setDropHint((h) => (h?.blockTempId === block.tempId && h.itemTempId === null ? null : h))
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleDropInto(e, block.tempId, null)
              setDropHint(null)
            }}
            className={cn(
              hasRounds
                ? 'border-primary/30 ring-primary/15 rounded-xl border-l-4 py-3 pr-3 pl-4 ring-1'
                : 'border-border rounded-xl border p-3',
              blockDropActive && 'ring-primary/60 ring-2',
            )}
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
                <select
                  value={block.kind}
                  onChange={(e) => updateBlockKind(block.tempId, e.target.value as SaveDayBlockKind)}
                  aria-label="Tipo de bloque"
                  className="border-input h-7 rounded-md border bg-transparent px-2 text-xs font-medium outline-none dark:bg-input/30"
                >
                  {NON_ROUNDS_BLOCK_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {BLOCK_KIND_LABEL[kind]}
                    </option>
                  ))}
                </select>
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
              {block.items.map((item) => {
                const videoId = item.exerciseId ? videoIdByExercise.get(item.exerciseId) : undefined
                const expanded = expandedItems.has(item.tempId)
                const gridClass = videoId
                  ? 'grid grid-cols-2 gap-2'
                  : 'grid grid-cols-2 gap-2 sm:grid-cols-4'
                const itemDropActive =
                  dropHint?.blockTempId === block.tempId && dropHint.itemTempId === item.tempId
                return (
                <div
                  key={item.tempId}
                  onDragOver={(e) => {
                    if (!dragTypesInclude(e)) return
                    e.preventDefault()
                    e.stopPropagation()
                    setDropHint({ blockTempId: block.tempId, itemTempId: item.tempId })
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return
                    setDropHint((h) =>
                      h?.blockTempId === block.tempId && h.itemTempId === item.tempId ? null : h,
                    )
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDropInto(e, block.tempId, item.tempId)
                    setDropHint(null)
                  }}
                  className={cn(
                    'bg-secondary/30 flex flex-col gap-2 rounded-lg border border-border p-2.5',
                    itemDropActive && 'border-t-primary border-t-2',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          ITEM_DRAG_TYPE,
                          JSON.stringify({ blockTempId: block.tempId, itemTempId: item.tempId }),
                        )
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => setDropHint(null)}
                      aria-label="Mover ejercicio"
                      title="Arrastrar para reordenar o mover a otro bloque"
                      className="text-muted-foreground/50 hover:text-foreground mt-1 shrink-0 cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </span>
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
                          patternOrMuscleLabel: item.groupLabel,
                          exerciseId: item.exerciseId,
                          exerciseName: item.exerciseName,
                        }}
                        onChange={(next) =>
                          updateItem(block.tempId, item.tempId, {
                            patternOrMuscleId: next.patternOrMuscleId,
                            groupLabel: next.patternOrMuscleLabel,
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

                  <div className="flex items-stretch gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className={gridClass}>
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
                          label="Carga"
                          value={item.load}
                          onChange={(v) => updateItem(block.tempId, item.tempId, { load: v })}
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

                      {expanded ? (
                        <div className={gridClass}>
                          <FreeTextField
                            label="Carga %"
                            value={item.loadPercent}
                            onChange={(v) => updateItem(block.tempId, item.tempId, { loadPercent: v })}
                          />
                          <FreeTextField
                            label="Distancia"
                            value={item.distance}
                            onChange={(v) => updateItem(block.tempId, item.tempId, { distance: v })}
                          />
                          <FreeTextField
                            label="Tiempo"
                            value={item.time}
                            onChange={(v) => updateItem(block.tempId, item.tempId, { time: v })}
                          />
                          <FreeTextField
                            label="Ritmo"
                            value={item.pace}
                            onChange={(v) => updateItem(block.tempId, item.tempId, { pace: v })}
                          />
                          <FreeTextField
                            label="Tempo"
                            value={item.tempo}
                            onChange={(v) => updateItem(block.tempId, item.tempId, { tempo: v })}
                            placeholder="3-1-1-0"
                            hint="Velocidad de cada repetición en segundos: bajada · pausa abajo · subida · pausa arriba. Ej. 3-1-1-0."
                          />
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.tempId)}
                        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-[11px] font-medium"
                      >
                        <ChevronDown
                          className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        />
                        {expanded ? 'Menos campos' : 'Carga % · distancia · tiempo · ritmo · tempo'}
                      </button>

                      <FreeTextField
                        label="Notas"
                        value={item.notes}
                        onChange={(v) => updateItem(block.tempId, item.tempId, { notes: v })}
                      />
                    </div>

                    {videoId ? (
                      <div className="hidden w-32 shrink-0 flex-col gap-0.5 sm:flex sm:w-36">
                        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                          Video
                        </span>
                        <ExerciseVideoPreview videoId={videoId} exerciseName={item.exerciseName} />
                      </div>
                    ) : null}
                  </div>
                </div>
                )
              })}
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
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addSectionBlock(e.target.value as SaveDayBlockKind)
            e.target.value = ''
          }}
          aria-label="Añadir sección"
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
        >
          <option value="">+ Sección…</option>
          {SECTION_BLOCK_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {BLOCK_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

/** ¿El ítem ya tiene algún campo de resistencia/actividad cargado? (para abrir la sección al entrar). */
function hasEnduranceFields(item: DraftItem): boolean {
  return Boolean(item.loadPercent || item.distance || item.time || item.pace || item.tempo)
}

function FreeTextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-0.5" title={hint}>
      <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
        {hint ? <span className="ml-0.5 cursor-help">ⓘ</span> : null}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-sm"
      />
    </label>
  )
}
