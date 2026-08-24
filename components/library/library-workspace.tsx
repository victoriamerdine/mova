'use client'

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/library/filter-bar'
import { ExerciseCard } from '@/components/library/exercise-card'
import { ExerciseDetailDialog } from '@/components/library/exercise-detail-dialog'
import { EXERCISES, type LibraryExercise } from '@/lib/data/library'

const PAGE_SIZE = 24

export function LibraryWorkspace() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [muscle, setMuscle] = useState('Todos')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<LibraryExercise | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EXERCISES.filter((ex) => {
      if (category !== 'Todas' && ex.category !== category) return false
      if (muscle !== 'Todos' && ex.muscle !== muscle) return false
      if (q && !ex.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [category, muscle, query])

  const visible = filtered.slice(0, visibleCount)
  const hasActiveFilters = category !== 'Todas' || muscle !== 'Todos' || query.trim() !== ''

  function resetVisible() {
    setVisibleCount(PAGE_SIZE)
  }

  function resetFilters() {
    setQuery('')
    setCategory('Todas')
    setMuscle('Todos')
    resetVisible()
  }

  return (
    <>
      <header className="bg-surface/85 sticky top-0 z-20 border-b border-border px-4 py-4 backdrop-blur sm:px-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Biblioteca de Ejercicios
            </h1>
            <p className="text-muted-foreground text-xs">
              {filtered.length} de {EXERCISES.length} ejercicios
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={resetFilters} className="bg-card shrink-0">
              Limpiar filtros
            </Button>
          ) : null}
        </div>

        <FilterBar
          query={query}
          onQueryChange={(v) => {
            setQuery(v)
            resetVisible()
          }}
          category={category}
          onCategoryChange={(v) => {
            setCategory(v)
            resetVisible()
          }}
          muscle={muscle}
          onMuscleChange={(v) => {
            setMuscle(v)
            resetVisible()
          }}
        />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed border-border px-5 py-16 text-center text-sm">
            Ningún ejercicio coincide con estos filtros.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onSelect={() => setSelected(exercise)}
                />
              ))}
            </div>

            {visibleCount < filtered.length ? (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="bg-card"
                >
                  Mostrar más ({filtered.length - visibleCount} restantes)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>

      <ExerciseDetailDialog exercise={selected} onClose={() => setSelected(null)} />
    </>
  )
}
