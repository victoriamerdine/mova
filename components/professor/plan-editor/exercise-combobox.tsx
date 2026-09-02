'use client'

import { useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { PlanBuilderCatalog } from '@/lib/supabase/queries/plan-editor'

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export type ExerciseSelection = {
  patternOrMuscleId: string | null
  exerciseId: string | null
  exerciseName: string
}

export function ExerciseCombobox({
  catalog,
  planType,
  value,
  onChange,
}: {
  catalog: PlanBuilderCatalog
  planType: string
  value: ExerciseSelection
  onChange: (next: ExerciseSelection) => void
}) {
  const [query, setQuery] = useState(value.exerciseName)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const usesPattern = planType === 'PATTERN'
  const groupOptions = usesPattern ? catalog.patterns : catalog.muscles

  const filteredExercises = useMemo(() => {
    const byGroup = catalog.exercises.filter((ex) =>
      value.patternOrMuscleId
        ? usesPattern
          ? ex.patternId === value.patternOrMuscleId
          : ex.muscleId === value.patternOrMuscleId
        : true,
    )
    const q = normalize(query.trim())
    const bySearch = q ? byGroup.filter((ex) => normalize(ex.name).includes(q)) : byGroup
    return bySearch.slice(0, 50)
  }, [catalog.exercises, value.patternOrMuscleId, usesPattern, query])

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        value={value.patternOrMuscleId ?? ''}
        onChange={(e) => {
          onChange({ patternOrMuscleId: e.target.value || null, exerciseId: null, exerciseName: '' })
          setQuery('')
        }}
        className="border-input h-8 shrink-0 rounded-lg border bg-transparent px-2 text-xs outline-none sm:w-36 dark:bg-input/30"
      >
        <option value="">{usesPattern ? 'Patrón…' : 'Músculo…'}</option>
        {groupOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>

      <div ref={wrapperRef} className="relative min-w-0 flex-1">
        <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 items-center gap-1.5 rounded-lg border bg-transparent px-2 focus-within:ring-3 dark:bg-input/30">
          <Search className="text-muted-foreground size-3.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              if (value.exerciseId) onChange({ ...value, exerciseId: null, exerciseName: e.target.value })
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar ejercicio…"
            className="h-full w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </div>

        {open && filteredExercises.length > 0 ? (
          <ul className="bg-popover text-popover-foreground ring-foreground/10 absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg p-1 shadow-md ring-1">
            {filteredExercises.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ ...value, exerciseId: ex.id, exerciseName: ex.name })
                    setQuery(ex.name)
                    setOpen(false)
                  }}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-left text-sm',
                    ex.id === value.exerciseId && 'bg-accent text-accent-foreground',
                  )}
                >
                  {ex.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
