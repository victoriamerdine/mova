'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CircleCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RpeSelector } from '@/components/student/rpe-selector'
import { todaySession } from '@/lib/data/student'

export function WorkoutExecutionScreen() {
  const router = useRouter()
  const exercises = todaySession.exercises
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0)

  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [setIndex, setSetIndex] = useState(0)
  const [load, setLoad] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState<number | null>(null)

  const finished = exerciseIndex >= exercises.length
  const exercise = finished ? null : exercises[exerciseIndex]
  const set = exercise ? exercise.sets[setIndex] : null

  useEffect(() => {
    if (!set) return
    setLoad(String(set.targetLoad))
    setReps(String(set.targetReps))
    setRpe(null)
  }, [set])

  const completedSets =
    exercises.slice(0, exerciseIndex).reduce((sum, ex) => sum + ex.sets.length, 0) + setIndex
  const progressPct = finished ? 100 : Math.round((completedSets / totalSets) * 100)

  function handleComplete() {
    if (!exercise) return
    if (setIndex < exercise.sets.length - 1) {
      setSetIndex((i) => i + 1)
    } else if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex((i) => i + 1)
      setSetIndex(0)
    } else {
      setExerciseIndex(exercises.length)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-border px-4 pt-8 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {todaySession.day}
          </h1>
        </div>
        <div className="bg-muted mt-3 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {exercise && set ? (
          <div className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex justify-center bg-zinc-950 p-3">
              {exercise.videoId ? (
                <div className="aspect-[9/16] max-h-[32svh] w-auto overflow-hidden rounded-xl">
                  <iframe
                    key={exercise.videoId}
                    src={`https://www.youtube.com/embed/${exercise.videoId}?autoplay=1&mute=1&loop=1&playlist=${exercise.videoId}&controls=0&modestbranding=1&playsinline=1`}
                    title={exercise.name}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="text-zinc-400 flex aspect-[9/16] max-h-[32svh] items-center justify-center rounded-xl bg-zinc-900 px-4 text-center text-xs">
                  Sin video disponible
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-4 p-4">
              <div>
                <h2 className="text-lg leading-tight font-semibold tracking-tight text-card-foreground">
                  {exercise.name}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Serie {setIndex + 1} de {exercise.sets.length}
                </p>
                <p className="text-primary mt-1 text-sm font-medium">
                  Meta: {set.targetReps} repeticiones · {set.targetLoad} kg
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Carga real (kg)
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={load}
                    onChange={(e) => setLoad(e.target.value)}
                    className="h-14 rounded-xl text-center text-2xl font-semibold tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Reps realizadas
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="h-14 rounded-xl text-center text-2xl font-semibold tabular-nums"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Esfuerzo percibido (RPE)
                </span>
                <RpeSelector value={rpe} onChange={setRpe} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 text-center">
            <CircleCheck className="text-primary size-12" />
            <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
              ¡Entrenamiento completado!
            </h2>
            <p className="text-muted-foreground text-sm">
              Registraste las {totalSets} series de {todaySession.day}. Buen trabajo.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-4">
        {exercise ? (
          <Button
            type="button"
            disabled={rpe === null || load === '' || reps === ''}
            onClick={handleComplete}
            className="h-14 w-full rounded-xl text-base font-semibold"
          >
            COMPLETAR SERIE ✓
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            className="h-14 w-full rounded-xl text-base font-semibold"
          >
            Volver
          </Button>
        )}
      </div>
    </div>
  )
}
