'use client'

import { ExternalLink, TriangleAlert, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { VideoThumb } from '@/components/library/video-thumb'
import type { LibraryExercise } from '@/lib/data/library'

export function ExerciseDetailDialog({
  exercise,
  onClose,
}: {
  exercise: LibraryExercise | null
  onClose: () => void
}) {
  if (!exercise) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={exercise.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-hidden rounded-2xl bg-card shadow-2xl sm:grid-cols-[minmax(0,280px)_1fr]"
      >
        <div className="relative bg-zinc-950">
          {exercise.videoId ? (
            <div className="aspect-[9/16] w-full">
              <iframe
                key={exercise.videoId}
                src={`https://www.youtube.com/embed/${exercise.videoId}`}
                title={exercise.name}
                className="h-full w-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <VideoThumb exercise={exercise} big />
          )}
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-lg leading-snug font-semibold tracking-tight text-card-foreground">
                {exercise.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge className="bg-primary/10 text-primary border-transparent">
                  {exercise.muscle}
                </Badge>
                <Badge variant="outline">{exercise.category}</Badge>
                {exercise.approxMatch ? (
                  <Badge className="bg-warning/15 text-warning-foreground gap-1 border-transparent">
                    <TriangleAlert className="size-3" />
                    Video a revisar
                  </Badge>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <X className="size-4.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <section className="mb-5">
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Clasificación
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-[11px]">Categoría / patrón</dt>
                  <dd className="font-medium text-foreground">{exercise.category}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[11px]">Músculo principal</dt>
                  <dd className="font-medium text-foreground">{exercise.muscle}</dd>
                </div>
              </dl>
            </section>

            {exercise.videoId ? (
              <a
                href={`https://www.youtube.com/shorts/${exercise.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary mb-5 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              >
                Ver en YouTube
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}

            <section className="text-muted-foreground rounded-xl border border-dashed border-border bg-muted/40 p-3.5 text-xs">
              Instrucciones paso a paso y errores frecuentes: pendientes de cargar para este
              ejercicio en la base de datos.
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
