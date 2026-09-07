'use client'

import { useMemo, useState } from 'react'
import { GripVertical, Plus, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { EXERCISE_DRAG_TYPE, normalizeText } from '@/components/professor/plan-editor/draft'
import type { CatalogExercise } from '@/lib/supabase/queries/plan-editor'

export type LibraryDragPayload = { id: string; name: string }

/**
 * Panel de biblioteca fijo a la derecha del editor de plan. Buscar y
 * arrastrar (o ＋) un ejercicio al día activo. Se suma al selector por fila,
 * no lo reemplaza. Solo en pantallas anchas (lg).
 */
export function ExerciseLibraryPanel({
  exercises,
  onAdd,
}: {
  exercises: CatalogExercise[]
  onAdd: (ex: LibraryDragPayload) => void
}) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = normalizeText(query.trim())
    const list = q ? exercises.filter((ex) => normalizeText(ex.name).includes(q)) : exercises
    return list.slice(0, 100)
  }, [exercises, query])

  return (
    <aside className="border-border bg-card sticky top-6 hidden max-h-[calc(100svh-3rem)] flex-col overflow-hidden rounded-xl border lg:flex">
      <div className="border-border border-b px-3 py-3">
        <p className="text-sm font-medium">Biblioteca</p>
        <p className="text-muted-foreground text-xs">Arrastrá al día o tocá ＋</p>
        <div className="border-input focus-within:border-ring focus-within:ring-ring/50 mt-2 flex h-8 items-center gap-1.5 rounded-lg border bg-transparent px-2 focus-within:ring-3 dark:bg-input/30">
          <Search className="text-muted-foreground size-3.5 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio…"
            aria-label="Buscar en la biblioteca"
            className="h-full w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {results.map((ex) => (
          <li
            key={ex.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(EXERCISE_DRAG_TYPE, JSON.stringify({ id: ex.id, name: ex.name }))
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className={cn(
              'group/lib bg-secondary/40 hover:bg-secondary mb-1.5 flex cursor-grab items-center gap-2 rounded-lg border border-border px-2 py-1.5 transition-colors active:cursor-grabbing',
            )}
          >
            <GripVertical aria-hidden className="text-muted-foreground/40 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs leading-snug">{ex.name}</span>
            <button
              type="button"
              aria-label={`Añadir ${ex.name} al día`}
              onClick={() => onAdd({ id: ex.id, name: ex.name })}
              className="text-muted-foreground hover:bg-primary hover:text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-colors group-hover/lib:opacity-100 focus-visible:opacity-100"
            >
              <Plus className="size-3.5" />
            </button>
          </li>
        ))}
        {results.length === 0 ? (
          <li className="text-muted-foreground px-2 py-6 text-center text-xs">Sin resultados</li>
        ) : null}
      </ul>
    </aside>
  )
}
