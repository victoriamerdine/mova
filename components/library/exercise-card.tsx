'use client'

import { Badge } from '@/components/ui/badge'
import { VideoThumb } from '@/components/library/video-thumb'
import type { LibraryExercise } from '@/lib/data/library'

export function ExerciseCard({
  exercise,
  onSelect,
}: {
  exercise: LibraryExercise
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group ring-foreground/10 flex flex-col overflow-hidden rounded-xl bg-card text-left shadow-sm ring-1 transition-shadow hover:shadow-md"
    >
      <VideoThumb exercise={exercise} />
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium text-card-foreground">
          {exercise.name}
        </h3>
        <div className="flex flex-wrap gap-1">
          <Badge className="bg-primary/10 text-primary border-transparent">{exercise.muscle}</Badge>
          <Badge variant="secondary">{exercise.category}</Badge>
        </div>
      </div>
    </button>
  )
}
