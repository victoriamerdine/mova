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
  /** Id del patrón/músculo del catálogo, si se eligió una opción (para filtrar la búsqueda). */
  patternOrMuscleId: string | null
  /** Rótulo del grupo — texto libre, puede quedar vacío. Es lo que se guarda. */
  patternOrMuscleLabel: string
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
  const [groupOpen, setGroupOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const usesPattern = planType === 'PATTERN'
  const groupOptions = usesPattern ? catalog.patterns : catalog.muscles

  const filteredGroups = useMemo(() => {
    const q = normalize(value.patternOrMuscleLabel.trim())
    const list = q ? groupOptions.filter((g) => normalize(g.name).includes(q)) : groupOptions
    return list.slice(0, 20)
  }, [groupOptions, value.patternOrMuscleLabel])

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

  function setGroupText(text: string) {
    // Si el texto coincide exacto con una opción del catálogo, guardamos su
    // id (así la búsqueda de ejercicios sigue filtrando). Si no, texto libre.
    const match = groupOptions.find((g) => normalize(g.name) === normalize(text.trim()))
    onChange({ ...value, patternOrMuscleId: match?.id ?? null, patternOrMuscleLabel: text })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative shrink-0 sm:w-40">
        <input
          type="text"
          value={value.patternOrMuscleLabel}
          onChange={(e) => {
            setGroupText(e.target.value)
            setGroupOpen(true)
          }}
          onFocus={() => setGroupOpen(true)}
          onBlur={() => window.setTimeout(() => setGroupOpen(false), 150)}
          placeholder={usesPattern ? 'Patrón (libre)…' : 'Músculo (libre)…'}
          aria-label={usesPattern ? 'Patrón' : 'Músculo'}
          className="border-input focus-within:border-ring focus-within:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2 text-xs outline-none focus-within:ring-3 dark:bg-input/30"
        />
        {groupOpen && filteredGroups.length > 0 ? (
          <ul className="bg-popover text-popover-foreground ring-foreground/10 absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg p-1 shadow-md ring-1">
            {filteredGroups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ ...value, patternOrMuscleId: g.id, patternOrMuscleLabel: g.name })
                    setGroupOpen(false)
                  }}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground w-full rounded-md px-2 py-1.5 text-left text-xs',
                    g.id === value.patternOrMuscleId && 'bg-accent text-accent-foreground',
                  )}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div ref={wrapperRef} className="relative min-w-0 flex-1">
        <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 items-center gap-1.5 rounded-lg border bg-transparent px-2 focus-within:ring-3 dark:bg-input/30">
          <Search className="text-muted-foreground size-3.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              // Propagar SIEMPRE: si no se elige del dropdown, el texto libre
              // igual queda como ejercicio/actividad (no es obligatorio que
              // sea de la biblioteca).
              onChange({ ...value, exerciseId: null, exerciseName: e.target.value })
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar o escribir libre…"
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
