'use client'

import { useState } from 'react'
import { Play, X } from 'lucide-react'

/**
 * Previsualización del video del ejercicio, embebida en la fila (no un
 * modal): se muestra siempre una miniatura y al tocarla el video se
 * reproduce ahí mismo, in situ. Formato vertical 9:16, igual que la
 * biblioteca.
 */
export function ExerciseVideoPreview({
  videoId,
  exerciseName,
}: {
  videoId: string
  exerciseName: string
}) {
  const [playing, setPlaying] = useState(false)
  const [imgError, setImgError] = useState(false)

  if (playing) {
    return (
      <div className="relative w-40 shrink-0 overflow-hidden rounded-lg bg-zinc-950">
        <div className="aspect-[9/16] w-full">
          <iframe
            key={videoId}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={exerciseName}
            className="h-full w-full"
            allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <button
          type="button"
          onClick={() => setPlaying(false)}
          aria-label="Cerrar video"
          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Reproducir video de ${exerciseName}`}
      className="group relative w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-secondary to-muted"
    >
      <div className="aspect-[9/16] w-full">
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <span className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/25" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/90 shadow transition-transform group-hover:scale-105">
          <Play className="size-4 translate-x-px fill-zinc-900 text-zinc-900" />
        </span>
      </span>
    </button>
  )
}
