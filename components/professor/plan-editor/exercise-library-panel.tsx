'use client'

import { useEffect, useMemo, useState } from 'react'
import { GripVertical, LibraryBig, Plus, Search, X } from 'lucide-react'

import { EXERCISE_DRAG_TYPE, normalizeText } from '@/components/professor/plan-editor/draft'
import type { CatalogExercise } from '@/lib/supabase/queries/plan-editor'

export type LibraryDragPayload = { id: string; name: string }

/**
 * Biblioteca del editor de plan. En desktop (`lg`) es un panel fijo a la
 * derecha: buscar y arrastrar (o ＋) un ejercicio al día activo. En mobile
 * es un botón flotante que abre una hoja inferior con la misma búsqueda
 * (sin arrastrar — se toca ＋). Se suma al selector por fila, no lo
 * reemplaza.
 */
export function ExerciseLibraryPanel({
  exercises,
  onAdd,
}: {
  exercises: CatalogExercise[]
  onAdd: (ex: LibraryDragPayload) => void
}) {
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const results = useMemo(() => {
    const q = normalizeText(query.trim())
    const list = q ? exercises.filter((ex) => normalizeText(ex.name).includes(q)) : exercises
    return list.slice(0, 100)
  }, [exercises, query])

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen])

  const SearchInput = (
    <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center gap-1.5 rounded-lg border bg-transparent px-2 focus-within:ring-3 dark:bg-input/30">
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
  )

  return (
    <>
      {/* Desktop: panel fijo a la derecha */}
      <aside className="border-border bg-card sticky top-6 hidden max-h-[calc(100svh-3rem)] flex-col overflow-hidden rounded-xl border lg:flex">
        <div className="border-border border-b px-3 py-3">
          <p className="text-sm font-medium">Biblioteca</p>
          <p className="text-muted-foreground text-xs">Arrastrá al día o tocá ＋</p>
          <div className="mt-2">{SearchInput}</div>
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
              className="group/lib bg-secondary/40 hover:bg-secondary mb-1.5 flex cursor-grab items-center gap-2 rounded-lg border border-border px-2 py-1.5 transition-colors active:cursor-grabbing"
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

      {/* Mobile: botón flotante + hoja inferior */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="bg-primary text-primary-foreground fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg lg:hidden"
      >
        <LibraryBig className="size-4" />
        Biblioteca
      </button>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Cerrar biblioteca"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="bg-card border-border relative flex max-h-[82svh] flex-col rounded-t-2xl border-t">
            <div className="border-border flex items-center gap-2 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Biblioteca</p>
                <p className="text-muted-foreground text-xs">Tocá ＋ para agregarlo al día abierto</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Cerrar"
                className="text-muted-foreground hover:text-foreground -mr-1 inline-flex size-9 items-center justify-center rounded-md"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="border-border border-b px-4 py-2">{SearchInput}</div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {results.map((ex) => (
                <li
                  key={ex.id}
                  className="bg-secondary/40 mb-1.5 flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm leading-snug">{ex.name}</span>
                  <button
                    type="button"
                    aria-label={`Añadir ${ex.name} al día`}
                    onClick={() => onAdd({ id: ex.id, name: ex.name })}
                    className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
                  >
                    <Plus className="size-4" />
                  </button>
                </li>
              ))}
              {results.length === 0 ? (
                <li className="text-muted-foreground px-2 py-8 text-center text-sm">Sin resultados</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
