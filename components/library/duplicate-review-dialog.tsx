'use client'

import { useState, useTransition } from 'react'
import { TriangleAlert, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { LibraryItem } from '@/lib/library'

/**
 * Se muestra al agregar un ejercicio que parece duplicado de otro que ya
 * está en la biblioteca. El profesor decide, por cada candidato:
 *  - Reemplazar: mismo ID, cambian los demás valores (updateExercise).
 *  - Reemplazar solo el video (replaceExerciseVideo).
 *  - Guardar igual: se crea uno nuevo (createExercise force).
 */
export function DuplicateReviewDialog({
  newName,
  duplicates,
  onReplaceAll,
  onReplaceVideo,
  onSaveAnyway,
  onCancel,
}: {
  newName: string
  duplicates: LibraryItem[]
  onReplaceAll: (existingId: string) => Promise<void>
  onReplaceVideo: (existingId: string) => Promise<void>
  onSaveAnyway: () => Promise<void>
  onCancel: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  function run(key: string, fn: () => Promise<void>) {
    setBusy(key)
    startTransition(async () => {
      await fn()
      setBusy(null)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revisar posible duplicado"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-2">
            <TriangleAlert className="text-warning-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold">Parece un duplicado</h2>
              <p className="text-muted-foreground text-xs">
                Ya hay {duplicates.length === 1 ? 'un ejercicio parecido' : `${duplicates.length} ejercicios parecidos`} a
                “{newName}”.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Volver"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ul className="flex flex-col gap-3">
            {duplicates.map((ex) => (
              <li key={ex.id} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{ex.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {ex.category} · {ex.muscle}
                    {ex.videoId ? ' · con video' : ' · sin video'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(`all-${ex.id}`, () => onReplaceAll(ex.id))}
                  >
                    {busy === `all-${ex.id}` ? 'Reemplazando…' : 'Reemplazar (mismo ID)'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(`vid-${ex.id}`, () => onReplaceVideo(ex.id))}
                  >
                    {busy === `vid-${ex.id}` ? 'Reemplazando…' : 'Reemplazar solo el video'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Volver a editar
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run('anyway', onSaveAnyway)}
          >
            {busy === 'anyway' ? 'Guardando…' : 'Guardar igual (nuevo ejercicio)'}
          </Button>
        </div>
      </div>
    </div>
  )
}
