'use client'

import { useMemo, useState } from 'react'
import { GripVertical, Plus, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { exerciseLibrary, type LibraryExercise } from '@/lib/data/builder'

export const EXERCISE_DRAG_TYPE = 'application/x-nucleo-exercise'

type ExerciseLibraryProps = {
  onAddExercise: (exercise: LibraryExercise) => void
}

export function ExerciseLibrary({ onAddExercise }: ExerciseLibraryProps) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return exerciseLibrary
    return exerciseLibrary.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(q) ||
        exercise.muscles.some((muscle) => muscle.toLowerCase().includes(q)),
    )
  }, [query])

  return (
    <Card className="gap-0 py-0 lg:sticky lg:top-[calc(4rem+1.5rem)] lg:h-[calc(100svh-4rem-3rem)]">
      <CardHeader className="gap-2 border-b border-border px-4 py-4">
        <CardTitle className="text-sm">Biblioteca rápida</CardTitle>
        <CardDescription className="text-xs">
          Arrastrá un ejercicio al plan o tocá + para añadirlo
        </CardDescription>
        <InputGroup className="mt-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar ejercicio o músculo…"
            aria-label="Buscar en la biblioteca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <ul className="flex flex-col gap-2">
          {results.map((exercise) => (
            <li
              key={exercise.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(EXERCISE_DRAG_TYPE, JSON.stringify(exercise))
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className="group/lib-item bg-secondary/50 hover:bg-secondary flex cursor-grab items-start gap-2 rounded-lg border border-border px-2.5 py-2 transition-colors active:cursor-grabbing"
            >
              <GripVertical
                aria-hidden="true"
                className="text-muted-foreground/50 mt-0.5 size-3.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs leading-snug font-medium">{exercise.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {exercise.muscles.map((muscle) => (
                    <Badge
                      key={muscle}
                      variant="outline"
                      className="text-muted-foreground h-4.5 px-1.5 text-[10px] font-normal"
                    >
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Añadir ${exercise.name} al plan`}
                onClick={() => onAddExercise(exercise)}
                className="text-muted-foreground hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring/50 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-colors group-hover/lib-item:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:outline-none"
              >
                <Plus className="size-3.5" />
              </button>
            </li>
          ))}

          {results.length === 0 ? (
            <li className="text-muted-foreground px-2 py-6 text-center text-xs">
              Sin resultados para "{query}"
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  )
}
