'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AiSearchPanel } from '@/components/library/ai-search-panel'
import { FilterBar } from '@/components/library/filter-bar'
import { ExerciseCard } from '@/components/library/exercise-card'
import { ExerciseDetailDialog } from '@/components/library/exercise-detail-dialog'
import { ExerciseFormDialog } from '@/components/library/exercise-form-dialog'
import { ChangeRequestsDialog } from '@/components/library/change-requests-dialog'
import { CsvImportDialog } from '@/components/library/csv-import-dialog'
import { deleteExercise, type CsvImportSummary } from '@/app/biblioteca/actions'
import type { ChangeRequest, LibraryItem } from '@/lib/library'
import type { LibraryCatalog } from '@/lib/supabase/queries/exercises'

const PAGE_SIZE = 24

export function LibraryWorkspace({
  exercises,
  catalog,
  canManage,
  pendingRequests,
}: {
  exercises: LibraryItem[]
  catalog: LibraryCatalog
  canManage: boolean
  pendingRequests: ChangeRequest[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [muscle, setMuscle] = useState('Todos')
  const [sport, setSport] = useState('Todos')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<LibraryItem | null>(null)
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; initial?: LibraryItem } | null>(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [deleting, startDeleting] = useTransition()

  const catalogNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of catalog.patterns) m.set(p.id, p.name)
    for (const mu of catalog.muscles) m.set(mu.id, mu.name)
    for (const s of catalog.sports) m.set(s.id, s.name)
    return m
  }, [catalog])

  const sportOptions = useMemo(() => ['Todos', ...catalog.sports.map((s) => s.name)], [catalog])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises.filter((ex) => {
      if (category !== 'Todas' && ex.category !== category) return false
      if (muscle !== 'Todos' && ex.muscle !== muscle) return false
      if (sport !== 'Todos' && !ex.sportNames.includes(sport)) return false
      if (q && !ex.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [category, muscle, sport, query, exercises])

  const visible = filtered.slice(0, visibleCount)
  const hasActiveFilters =
    category !== 'Todas' || muscle !== 'Todos' || sport !== 'Todos' || query.trim() !== ''

  function resetVisible() {
    setVisibleCount(PAGE_SIZE)
  }

  function resetFilters() {
    setQuery('')
    setCategory('Todas')
    setMuscle('Todos')
    setSport('Todos')
    resetVisible()
  }

  function afterSave(msg: string) {
    setForm(null)
    setSelected(null)
    setToast(msg)
    router.refresh()
    window.setTimeout(() => setToast(null), 3500)
  }

  function handleDelete(ex: LibraryItem) {
    if (!confirm(`¿Eliminar "${ex.name}" de la biblioteca?`)) return
    startDeleting(async () => {
      const res = await deleteExercise(ex.id)
      if (res.error) {
        setToast(`No se pudo eliminar: ${res.error}`)
      } else {
        setToast(res.archived ? 'Ejercicio archivado (está en uso en algún plan).' : 'Ejercicio eliminado.')
      }
      setSelected(null)
      router.refresh()
      window.setTimeout(() => setToast(null), 3500)
    })
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
              {filtered.length} de {exercises.length} ejercicios
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters} className="bg-card">
                Limpiar filtros
              </Button>
            ) : null}
            {canManage && pendingRequests.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => setReviewsOpen(true)}
              >
                Aprobaciones pendientes ({pendingRequests.length})
              </Button>
            ) : null}
            {canManage ? (
              <Button variant="outline" size="sm" className="bg-card" onClick={() => setImportOpen(true)}>
                Importar CSV
              </Button>
            ) : null}
            {canManage ? (
              <Button size="sm" onClick={() => setForm({ mode: 'create' })}>
                <Plus data-icon="inline-start" />
                Agregar ejercicio
              </Button>
            ) : null}
          </div>
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
          sport={sport}
          onSportChange={(v) => {
            setSport(v)
            resetVisible()
          }}
          sportOptions={sportOptions}
        />
      </header>

      <AiSearchPanel onSelect={setSelected} />

      {toast ? (
        <div className="bg-primary/10 text-primary border-primary/20 mx-4 mt-3 rounded-lg border px-3 py-2 text-xs sm:mx-6">
          {toast}
        </div>
      ) : null}

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed border-border px-5 py-16 text-center text-sm">
            Ningún ejercicio coincide con estos filtros.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
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

      <ExerciseDetailDialog
        exercise={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onEdit={(ex) => setForm({ mode: 'edit', initial: ex })}
        onDelete={handleDelete}
        deleting={deleting}
      />

      {form ? (
        <ExerciseFormDialog
          mode={form.mode}
          initial={form.initial}
          catalog={catalog}
          onClose={() => setForm(null)}
          onSaved={afterSave}
        />
      ) : null}

      {reviewsOpen ? (
        <ChangeRequestsDialog
          requests={pendingRequests}
          catalogNameById={catalogNameById}
          onClose={() => setReviewsOpen(false)}
          onResolved={(msg) => {
            setReviewsOpen(false)
            setToast(msg)
            router.refresh()
            window.setTimeout(() => setToast(null), 3500)
          }}
        />
      ) : null}

      {importOpen ? (
        <CsvImportDialog
          catalog={catalog}
          exercises={exercises}
          onClose={() => setImportOpen(false)}
          onDone={(s: CsvImportSummary) => {
            setImportOpen(false)
            const parts = [
              s.created ? `${s.created} nuevos` : null,
              s.updated ? `${s.updated} actualizados` : null,
              s.pendingReview ? `${s.pendingReview} a revisión` : null,
              s.skipped ? `${s.skipped} omitidos` : null,
            ].filter(Boolean)
            setToast(
              `Importación: ${parts.join(', ') || 'sin cambios'}.` +
                (s.errors.length ? ` ${s.errors.length} con error.` : ''),
            )
            router.refresh()
            window.setTimeout(() => setToast(null), 6000)
          }}
        />
      ) : null}
    </>
  )
}
