'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'

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

  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [duplicates, setDuplicates] = useState<LibraryItem[] | null>(null)

  function currentInput(): ExerciseFormInput {
    return {
      name,
      patternId: patternId || null,
      muscleId: muscleId || null,
      difficulty: (difficulty || null) as ExerciseFormInput['difficulty'],
      description,
      instructions,
      videoUrl,
    }
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      if (mode === 'edit' && initial) {
        const res = await updateExercise(initial.id, currentInput())
        if (res.error) setError(res.error)
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
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>

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

          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
            {pending ? 'Guardando…' : mode === 'create' ? 'Agregar' : 'Guardar cambios'}
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
