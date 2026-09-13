'use client'

import { Check } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { VideoThumb } from '@/components/library/video-thumb'
import { cn } from '@/lib/utils'
import type { LibraryItem } from '@/lib/library'

export function ExerciseCard({
  exercise,
  onSelect,
  selectable = false,
  selected = false,
}: {
  exercise: LibraryItem
  /** En modo normal, abre el detalle. En modo selección, marca/desmarca la tarjeta. */
  onSelect: () => void
  selectable?: boolean
  selected?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selectable ? selected : undefined}
      className={cn(
        'group ring-foreground/10 relative flex flex-col overflow-hidden rounded-xl bg-card text-left shadow-sm ring-1 transition-shadow hover:shadow-md',
        selectable && selected && 'ring-primary ring-2',
      )}
    >
      {selectable ? (
        <span
          aria-hidden
          className={cn(
            'absolute top-2 left-2 z-10 flex size-6 items-center justify-center rounded-full border-2 shadow',
            selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-white bg-black/30 backdrop-blur',
          )}
        >
          {selected ? <Check className="size-4" /> : null}
        </span>
      ) : null}
      <VideoThumb exercise={exercise} />
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium text-card-foreground">
          {exercise.name}
        </h3>
        <div className="flex flex-wrap gap-1">
          <Badge className="bg-primary/10 text-primary border-transparent">{exercise.muscle}</Badge>
          <Badge variant="secondary">{exercise.category}</Badge>
          {exercise.sportNames.slice(0, 2).map((s) => (
            <Badge key={s} variant="outline" className="text-muted-foreground">
              {s}
            </Badge>
          ))}
        </div>
      </div>
    </button>
  )
}
