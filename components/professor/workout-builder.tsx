'use client'

import { useState } from 'react'
import { Layers, Link2, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MetricField } from '@/components/professor/metric-field'
import { EXERCISE_DRAG_TYPE, ExerciseLibrary } from '@/components/professor/exercise-library'
import {
  initialBlocks,
  type IndividualBlock,
  type LibraryExercise,
  type SupersetBlock,
  type SupersetExercise,
  type WorkoutBlock,
} from '@/lib/data/builder'
import { cn } from '@/lib/utils'

let uid = 100
const nextId = (prefix: string) => `${prefix}-${uid++}`

export function ConstructorWorkspace() {
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialBlocks)
  const [isDragOver, setIsDragOver] = useState(false)

  function addIndividualBlock(fromLibrary?: LibraryExercise) {
    const block: IndividualBlock = {
      id: nextId('block'),
      kind: 'individual',
      exercise: fromLibrary?.name ?? '',
      sets: 3,
      reps: 10,
      load: 20,
      rest: 60,
    }
    setBlocks((prev) => [...prev, block])
  }

  function addSupersetBlock() {
    const block: SupersetBlock = {
      id: nextId('block'),
      kind: 'superset',
      rounds: 3,
      rest: 60,
      exercises: [
        { id: nextId('ex'), label: 'A1', exercise: '', sets: 3, reps: 10 },
        { id: nextId('ex'), label: 'A2', exercise: '', sets: 3, reps: 10 },
      ],
    }
    setBlocks((prev) => [...prev, block])
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((block) => block.id !== id))
  }

  function updateIndividual(id: string, patch: Partial<IndividualBlock>) {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    )
  }

  function updateSuperset(id: string, patch: Partial<SupersetBlock>) {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    )
  }

  function updateSupersetExercise(
    blockId: string,
    exerciseId: string,
    patch: Partial<SupersetExercise>,
  ) {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.kind !== 'superset') return block
        return {
          ...block,
          exercises: block.exercises.map((exercise) =>
            exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
          ),
        }
      }),
    )
  }

  function addSupersetExercise(blockId: string) {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.kind !== 'superset') return block
        const nextLabel = `A${block.exercises.length + 1}`
        return {
          ...block,
          exercises: [
            ...block.exercises,
            { id: nextId('ex'), label: nextLabel, exercise: '', sets: 3, reps: 10 },
          ],
        }
      }),
    )
  }

  function removeSupersetExercise(blockId: string, exerciseId: string) {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.kind !== 'superset') return block
        if (block.exercises.length <= 2) return block
        return {
          ...block,
          exercises: block.exercises
            .filter((exercise) => exercise.id !== exerciseId)
            .map((exercise, index) => ({ ...exercise, label: `A${index + 1}` })),
        }
      }),
    )
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(EXERCISE_DRAG_TYPE)) {
            e.preventDefault()
            setIsDragOver(true)
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(EXERCISE_DRAG_TYPE)
          if (!raw) return
          e.preventDefault()
          setIsDragOver(false)
          const exercise = JSON.parse(raw) as LibraryExercise
          addIndividualBlock(exercise)
        }}
        className={cn(
          'flex flex-col gap-4 rounded-xl transition-colors',
          isDragOver && 'bg-primary/5 ring-2 ring-primary/40 ring-dashed',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => addIndividualBlock()}>
            <Plus data-icon="inline-start" />
            Añadir bloque individual
          </Button>
          <Button variant="outline" size="sm" onClick={addSupersetBlock}>
            <Layers data-icon="inline-start" />
            Añadir bloque combinado
          </Button>
        </div>

        {blocks.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm">
            Todavía no hay bloques. Añadí uno o arrastrá un ejercicio desde la biblioteca.
          </div>
        ) : null}

        {blocks.map((block) =>
          block.kind === 'individual' ? (
            <IndividualBlockCard
              key={block.id}
              block={block}
              onChange={(patch) => updateIndividual(block.id, patch)}
              onRemove={() => removeBlock(block.id)}
            />
          ) : (
            <SupersetBlockCard
              key={block.id}
              block={block}
              onChangeShared={(patch) => updateSuperset(block.id, patch)}
              onChangeExercise={(exerciseId, patch) =>
                updateSupersetExercise(block.id, exerciseId, patch)
              }
              onAddExercise={() => addSupersetExercise(block.id)}
              onRemoveExercise={(exerciseId) => removeSupersetExercise(block.id, exerciseId)}
              onRemove={() => removeBlock(block.id)}
            />
          ),
        )}
      </div>

      <ExerciseLibrary onAddExercise={(exercise) => addIndividualBlock(exercise)} />
    </>
  )
}

function IndividualBlockCard({
  block,
  onChange,
  onRemove,
}: {
  block: IndividualBlock
  onChange: (patch: Partial<IndividualBlock>) => void
  onRemove: () => void
}) {
  return (
    <Card className="gap-0 py-4">
      <CardHeader className="flex-row items-center gap-2 px-4">
        <Input
          value={block.exercise}
          onChange={(e) => onChange({ exercise: e.target.value })}
          placeholder="Nombre del ejercicio…"
          aria-label="Nombre del ejercicio"
          className="h-8 flex-1 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none hover:bg-muted/60 focus-visible:bg-transparent"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Quitar bloque"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 />
        </Button>
      </CardHeader>

      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricField
            label="Series"
            value={block.sets}
            onChange={(sets) => onChange({ sets })}
          />
          <MetricField
            label="Reps"
            value={block.reps}
            onChange={(reps) => onChange({ reps })}
          />
          <MetricField
            label="Carga"
            unit="kg"
            value={block.load}
            onChange={(load) => onChange({ load })}
          />
          <MetricField
            label="Pausa"
            unit="s"
            value={block.rest}
            onChange={(rest) => onChange({ rest })}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function SupersetBlockCard({
  block,
  onChangeShared,
  onChangeExercise,
  onAddExercise,
  onRemoveExercise,
  onRemove,
}: {
  block: SupersetBlock
  onChangeShared: (patch: Partial<SupersetBlock>) => void
  onChangeExercise: (exerciseId: string, patch: Partial<SupersetExercise>) => void
  onAddExercise: () => void
  onRemoveExercise: (exerciseId: string) => void
  onRemove: () => void
}) {
  return (
    <Card className="border-primary/30 ring-primary/15 gap-0 border-l-4 py-4 ring-1">
      <CardHeader className="gap-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-transparent">
            <Layers data-icon="inline-start" className="size-3" />
            Superserie
          </Badge>
          <span className="text-muted-foreground text-xs">Bloque combinado</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Quitar bloque"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive ml-auto shrink-0"
          >
            <Trash2 />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-64">
          <MetricField
            label="Vueltas del bloque"
            value={block.rounds}
            onChange={(rounds) => onChangeShared({ rounds })}
          />
          <MetricField
            label="Pausa entre vueltas"
            unit="s"
            value={block.rest}
            onChange={(rest) => onChangeShared({ rest })}
          />
        </div>
      </CardHeader>

      <CardContent className="px-4">
        <div className="flex flex-col">
          {block.exercises.map((exercise, index) => (
            <div key={exercise.id}>
              {index > 0 ? (
                <div className="flex items-center gap-2 py-1.5 pl-3.5">
                  <Link2
                    aria-hidden="true"
                    className="text-primary/50 size-3.5 shrink-0 -rotate-45"
                  />
                  <span className="text-muted-foreground/70 text-[10px] tracking-wide uppercase">
                    intercalado
                  </span>
                </div>
              ) : null}

              <div className="bg-secondary/40 flex items-start gap-3 rounded-lg border border-border p-3">
                <span className="bg-primary/10 text-primary mt-0.5 flex h-6 w-9 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold">
                  {exercise.label}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <Input
                    value={exercise.exercise}
                    onChange={(e) => onChangeExercise(exercise.id, { exercise: e.target.value })}
                    placeholder="Nombre del ejercicio…"
                    aria-label={`Nombre del ejercicio ${exercise.label}`}
                    className="h-7 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none hover:bg-muted/60 focus-visible:bg-card"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <MetricField
                      label="Series"
                      value={exercise.sets}
                      onChange={(sets) => onChangeExercise(exercise.id, { sets })}
                    />
                    <MetricField
                      label="Reps"
                      value={exercise.reps}
                      onChange={(reps) => onChangeExercise(exercise.id, { reps })}
                    />
                  </div>
                </div>

                {block.exercises.length > 2 ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar ${exercise.label}`}
                    onClick={() => onRemoveExercise(exercise.id)}
                    className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onAddExercise}
          className="text-muted-foreground hover:text-foreground mt-2.5 w-full border border-dashed border-border"
        >
          <Plus data-icon="inline-start" />
          Añadir ejercicio al bloque
        </Button>
      </CardContent>
    </Card>
  )
}
