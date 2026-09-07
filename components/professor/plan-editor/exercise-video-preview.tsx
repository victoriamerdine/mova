'use client'

import { useEffect, useState } from 'react'
import { Play, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Botón "ver video" que aparece al lado de un ejercicio ya elegido en el
 * Constructor. Abre un modal chico con el embed de YouTube (formato vertical
 * 9:16, igual que la biblioteca) — mismo patrón visual que
 * components/library/exercise-detail-dialog.tsx.
 */
export function ExerciseVideoPreview({
  videoId,
  exerciseName,
}: {
  videoId: string
  exerciseName: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label={`Ver video de ${exerciseName}`}
        className="text-muted-foreground hover:text-primary mt-0.5 shrink-0"
      >
        <Play className="size-3.5" />
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Video: ${exerciseName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-xs overflow-hidden rounded-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <p className="truncate text-sm font-medium">{exerciseName}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="aspect-[9/16] w-full bg-zinc-950">
              <iframe
                key={videoId}
                src={`https://www.youtube.com/embed/${videoId}`}
                title={exerciseName}
                className="h-full w-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
