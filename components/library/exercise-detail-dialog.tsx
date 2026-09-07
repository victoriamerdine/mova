'use client'

import { ExternalLink, Pencil, TriangleAlert, Trash2, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VideoThumb } from '@/components/library/video-thumb'
import type { LibraryItem } from '@/lib/library'

export function ExerciseDetailDialog({
  exercise,
  canManage,
  onClose,
  onEdit,
  onDelete,
  deleting,
}: {
  exercise: LibraryItem | null
  canManage: boolean
  onClose: () => void
  onEdit: (ex: LibraryItem) => void
  onDelete: (ex: LibraryItem) => void
  deleting: boolean
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
                {exercise.difficulty ? (
                  <Badge variant="secondary" className="capitalize">
                    {exercise.difficulty}
                  </Badge>
                ) : null}
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
            {exercise.videoId ? (
              <a
                href={`https://www.youtube.com/shorts/${exercise.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary mb-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              >
                Ver en YouTube
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}

            {exercise.description ? (
              <section className="mb-4">
                <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                  Descripción
                </h3>
                <p className="text-sm whitespace-pre-line">{exercise.description}</p>
              </section>
            ) : null}

            {exercise.instructions ? (
              <section className="mb-4">
                <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                  Instrucciones / errores frecuentes
                </h3>
                <p className="text-sm whitespace-pre-line">{exercise.instructions}</p>
              </section>
            ) : null}

            {!exercise.description && !exercise.instructions ? (
              <section className="text-muted-foreground rounded-xl border border-dashed border-border bg-muted/40 p-3.5 text-xs">
                Sin descripción ni instrucciones cargadas.
              </section>
            ) : null}
          </div>

          {canManage ? (
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive mr-auto"
                disabled={deleting}
                onClick={() => onDelete(exercise)}
              >
                <Trash2 data-icon="inline-start" />
                Eliminar
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(exercise)}>
                <Pencil data-icon="inline-start" />
                Editar
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
