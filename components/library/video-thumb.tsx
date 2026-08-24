'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { LibraryExercise } from '@/lib/data/library'

export function VideoThumb({
  exercise,
  big = false,
}: {
  exercise: LibraryExercise
  big?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const showImage = exercise.videoId && !imgError

  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-muted',
        big ? 'aspect-[9/16]' : 'aspect-[9/16] rounded-t-xl',
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://i.ytimg.com/vi/${exercise.videoId}/hqdefault.jpg`}
          alt=""
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-black/15" />
      {exercise.videoId ? (
        <span
          className={cn(
            'relative flex items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur transition-transform group-hover:scale-105',
            big ? 'size-16' : 'size-11',
          )}
        >
          <Play
            className={cn(
              'translate-x-0.5 fill-zinc-900 text-zinc-900',
              big ? 'size-7' : 'size-4.5',
            )}
          />
        </span>
      ) : (
        <span className="relative rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium text-white">
          Sin video
        </span>
      )}
    </div>
  )
}
