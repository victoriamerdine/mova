'use client'

import { useState, useTransition } from 'react'
import { Lock, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DuplicateReviewDialog } from '@/components/library/duplicate-review-dialog'
import type { ExerciseFormInput, LibraryItem } from '@/lib/library'
import type { LibraryCatalog } from '@/lib/supabase/queries/exercises'
import {
  createExercise,
  replaceExerciseVideo,
  updateExercise,
} from '@/app/biblioteca/actions'

const DIFFICULTIES = [
  { value: '', label: 'Sin especificar' },
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
] as const

export function ExerciseFormDialog({
  mode,
  initial,
  catalog,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initial?: LibraryItem
  catalog: LibraryCatalog
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [patternId, setPatternId] = useState(initial?.patternId ?? '')
  const [muscleId, setMuscleId] = useState(initial?.muscleId ?? '')
  const [difficulty, setDifficulty] = useState<string>(initial?.difficulty ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '')
  const [sportIds, setSportIds] = useState<string[]>(initial?.sportIds ?? [])

  const [owned, setOwned] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [duplicates, setDuplicates] = useState<LibraryItem[] | null>(null)

  // Al editar un ejercicio con dueño distinto al usuario actual, el guardado
  // no aplica: crea una solicitud de cambio que el dueño aprueba.
  const goesToReview = mode === 'edit' && !!initial && !!initial.ownerId && !initial.isMine

  function currentInput(): ExerciseFormInput {
    return {
      name,
      patternId: patternId || null,
      muscleId: muscleId || null,
      difficulty: (difficulty || null) as ExerciseFormInput['difficulty'],
      description,
      instructions,
      videoUrl,
      sportIds,
      owned,
    }
  }

  function toggleSport(id: string) {
    setSportIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      if (mode === 'edit' && initial) {
        const res = await updateExercise(initial.id, currentInput())
        if (res.error) setError(res.error)
        else if (res.pendingReview)
          onSaved(`Cambio enviado a la aprobación de ${res.ownerName ?? 'el dueño'}.`)
        else onSaved('Ejercicio actualizado.')
        return
      }
      const res = await createExercise(currentInput())
      if (res.error) setError(res.error)
      else if (res.duplicates && res.duplicates.length > 0) setDuplicates(res.duplicates)
      else onSaved('Ejercicio agregado.')
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Agregar ejercicio' : 'Editar ejercicio'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">
            {mode === 'create' ? 'Agregar ejercicio' : 'Editar ejercicio'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {goesToReview ? (
            <div className="bg-warning/10 text-warning-foreground border-warning/20 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Este ejercicio es de <strong>{initial?.ownerName}</strong>. Al guardar, tus cambios
                quedan <strong>pendientes de su aprobación</strong> — no se aplican todavía.
              </span>
            </div>
          ) : null}

          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>

          {mode === 'create' ? (
            <Field label="Propiedad">
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="owned"
                    checked={owned}
                    onChange={() => setOwned(true)}
                  />
                  Asociarlo a mi nombre
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="owned"
                    checked={!owned}
                    onChange={() => setOwned(false)}
                  />
                  Público
                </label>
              </div>
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Patrón">
              <Select value={patternId} onChange={setPatternId} options={catalog.patterns} empty="—" />
            </Field>
            <Field label="Músculo">
              <Select value={muscleId} onChange={setMuscleId} options={catalog.muscles} empty="—" />
            </Field>
          </div>

          <Field label="Dificultad">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Video (URL de YouTube)">
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/shorts/…"
            />
          </Field>

          <Field label="Descripción">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>

          <Field label="Instrucciones / errores frecuentes">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </Field>

          {catalog.sports.length > 0 ? (
            <Field label="Deportes">
              <div className="flex flex-wrap gap-1.5">
                {catalog.sports.map((s) => {
                  const on = sportIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSport(s.id)}
                      className={
                        on
                          ? 'bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-medium'
                          : 'border-input text-muted-foreground hover:text-foreground rounded-full border px-2.5 py-1 text-xs'
                      }
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </Field>
          ) : null}

          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
            {pending
              ? 'Guardando…'
              : mode === 'create'
                ? 'Agregar'
                : goesToReview
                  ? 'Enviar a revisión'
                  : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      {duplicates ? (
        <DuplicateReviewDialog
          newName={name.trim()}
          duplicates={duplicates}
          onReplaceAll={async (existingId) => {
            const res = await updateExercise(existingId, currentInput())
            if (res.error) setError(res.error)
            else onSaved('Ejercicio reemplazado.')
          }}
          onReplaceVideo={async (existingId) => {
            const res = await replaceExerciseVideo(existingId, videoUrl)
            if (res.error) setError(res.error)
            else onSaved('Video reemplazado.')
          }}
          onSaveAnyway={async () => {
            const res = await createExercise(currentInput(), { force: true })
            if (res.error) setError(res.error)
            else onSaved('Ejercicio agregado.')
          }}
          onCancel={() => setDuplicates(null)}
        />
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
      {children}
    </label>
  )
}

function Select({
  value,
  onChange,
  options,
  empty,
}: {
  value: string
  onChange: (v: string) => void
  options: { id: string; name: string }[]
  empty: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm outline-none dark:bg-input/30"
    >
      <option value="">{empty}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}
