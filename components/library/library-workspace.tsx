'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AiSearchPanel } from '@/components/library/ai-search-panel'
import { FilterBar } from '@/components/library/filter-bar'
import { ExerciseCard } from '@/components/library/exercise-card'
import { ExerciseDetailDialog } from '@/components/library/exercise-detail-dialog'
import { ExerciseFormDialog } from '@/components/library/exercise-form-dialog'
import { ChangeRequestsDialog } from '@/components/library/change-requests-dialog'
import { CsvImportDialog } from '@/components/library/csv-import-dialog'
import { deleteExercise, markVideoReviewed, type CsvImportSummary } from '@/app/biblioteca/actions'
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
  const [capacity, setCapacity] = useState('Todas')
  const [reviewOnly, setReviewOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<LibraryItem | null>(null)
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; initial?: LibraryItem } | null>(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [deleting, startDeleting] = useTransition()
  const [markingReviewed, startMarkingReviewed] = useTransition()
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, startBulkDeleting] = useTransition()

  const catalogNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of catalog.patterns) m.set(p.id, p.name)
    for (const mu of catalog.muscles) m.set(mu.id, mu.name)
    for (const s of catalog.sports) m.set(s.id, s.name)
    return m
  }, [catalog])

  const sportOptions = useMemo(() => ['Todos', ...catalog.sports.map((s) => s.name)], [catalog])
  const capacityOptions = useMemo(
    () => ['Todas', ...catalog.capacities.map((c) => c.name)],
    [catalog],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises.filter((ex) => {
      if (category !== 'Todas' && ex.category !== category) return false
      if (muscle !== 'Todos' && ex.muscle !== muscle) return false
      if (sport !== 'Todos' && !ex.sportNames.includes(sport)) return false
      if (capacity !== 'Todas' && !ex.capacityNames.includes(capacity)) return false
      if (reviewOnly && !ex.approxMatch) return false
      if (q && !ex.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [category, muscle, sport, capacity, reviewOnly, query, exercises])

  const visible = filtered.slice(0, visibleCount)
  const hasActiveFilters =
    category !== 'Todas' ||
    muscle !== 'Todos' ||
    sport !== 'Todos' ||
    capacity !== 'Todas' ||
    reviewOnly ||
    query.trim() !== ''

  function resetVisible() {
    setVisibleCount(PAGE_SIZE)
  }

  function resetFilters() {
    setQuery('')
    setCategory('Todas')
    setMuscle('Todos')
    setSport('Todos')
    setCapacity('Todas')
    setReviewOnly(false)
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

  function handleMarkReviewed(ex: LibraryItem) {
    startMarkingReviewed(async () => {
      const res = await markVideoReviewed(ex.id)
      if (res.error) {
        setToast(`No se pudo marcar como revisado: ${res.error}`)
      } else {
        setToast('Video marcado como revisado.')
        setSelected((prev) => (prev && prev.id === ex.id ? { ...prev, approxMatch: false } : prev))
      }
      router.refresh()
      window.setTimeout(() => setToast(null), 3500)
    })
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const allSelected = visible.every((ex) => prev.has(ex.id))
      if (allSelected) {
        const next = new Set(prev)
        for (const ex of visible) next.delete(ex.id)
        return next
      }
      return new Set([...prev, ...visible.map((ex) => ex.id)])
    })
  }

  function handleBulkDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!confirm(`¿Eliminar ${ids.length} ejercicio${ids.length === 1 ? '' : 's'} de la biblioteca?`)) return

    startBulkDeleting(async () => {
      let deletedCount = 0
      let archivedCount = 0
      const errors: string[] = []

      for (const id of ids) {
        const ex = exercises.find((e) => e.id === id)
        const res = await deleteExercise(id)
        if (res.error) errors.push(`${ex?.name ?? id}: ${res.error}`)
        else if (res.archived) archivedCount++
        else deletedCount++
      }

      const parts = [
        deletedCount ? `${deletedCount} eliminado${deletedCount === 1 ? '' : 's'}` : null,
        archivedCount ? `${archivedCount} archivado${archivedCount === 1 ? '' : 's'} (en uso)` : null,
        errors.length ? `${errors.length} con error` : null,
      ].filter(Boolean)
      setToast(parts.join(', ') || 'Sin cambios.')

      setSelectedIds(new Set())
      setSelectMode(false)
      router.refresh()
      window.setTimeout(() => setToast(null), 6000)
    })
  }

  return (
    <>
      <header className="bg-surface/85 z-20 border-b border-border px-4 py-4 backdrop-blur sm:px-6 lg:sticky lg:top-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Biblioteca de Ejercicios
            </h1>
            <p className="text-muted-foreground text-xs">
              {filtered.length} de {exercises.length} ejercicios
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              <Button
                variant={selectMode ? 'default' : 'outline'}
                size="sm"
                className={selectMode ? '' : 'bg-card'}
                onClick={toggleSelectMode}
              >
                <CheckSquare data-icon="inline-start" />
                {selectMode ? 'Cancelar selección' : 'Seleccionar'}
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
          capacity={capacity}
          onCapacityChange={(v) => {
            setCapacity(v)
            resetVisible()
          }}
          capacityOptions={capacityOptions}
          reviewOnly={reviewOnly}
          onReviewOnlyChange={(v) => {
            setReviewOnly(v)
            resetVisible()
          }}
        />
      </header>

      <AiSearchPanel onSelect={setSelected} />

      {toast ? (
        <div className="bg-primary/10 text-primary border-primary/20 mx-4 mt-3 rounded-lg border px-3 py-2 text-xs sm:mx-6">
          {toast}
        </div>
      ) : null}

      {selectMode ? (
        <div className="bg-card border-border sticky top-[7.5rem] z-10 mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 sm:mx-6 lg:top-[8.5rem]">
          <span className="text-sm font-medium">
            {selectedIds.size} seleccionado{selectedIds.size === 1 ? '' : 's'}
          </span>
          <Button variant="ghost" size="sm" onClick={selectAllVisible}>
            {visible.every((ex) => selectedIds.has(ex.id)) && visible.length > 0
              ? 'Deseleccionar visibles'
              : 'Seleccionar visibles'}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || bulkDeleting}
              onClick={handleBulkDelete}
            >
              <Trash2 data-icon="inline-start" />
              {bulkDeleting ? 'Eliminando…' : `Eliminar${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleSelectMode} aria-label="Cerrar selección">
              <X className="size-4" />
            </Button>
          </div>
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
                  selectable={selectMode}
                  selected={selectedIds.has(exercise.id)}
                  onSelect={() =>
                    selectMode ? toggleSelected(exercise.id) : setSelected(exercise)
                  }
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
        onMarkReviewed={handleMarkReviewed}
        markingReviewed={markingReviewed}
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
