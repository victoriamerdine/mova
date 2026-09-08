'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, History } from 'lucide-react'

import type { StudentActivePlan, StudentWorkout } from '@/lib/supabase/queries/student-plan'

function relDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return d.toLocaleDateString()
}

export function StudentHome({ name, plan }: { name: string; plan: StudentActivePlan }) {
  const weekNumbers = useMemo(
    () => [...new Set(plan.workouts.map((w) => w.weekNumber))].sort((a, b) => a - b),
    [plan.workouts],
  )
  const nextWeek =
    plan.workouts.find((w) => w.id === plan.nextWorkoutId)?.weekNumber ?? weekNumbers[0] ?? 1
  const [week, setWeek] = useState(nextWeek)

  const daysOfWeek = plan.workouts.filter((w) => w.weekNumber === week)
  const ended = plan.endDate ? new Date(plan.endDate) < new Date(new Date().toDateString()) : false
  const range =
    plan.startDate && plan.endDate
      ? `${new Date(plan.startDate).toLocaleDateString()} – ${new Date(plan.endDate).toLocaleDateString()}`
      : null

  return (
    <>
      <header className="space-y-1">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Tu entrenamiento</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hola {name.split(' ')[0]}</h1>
        <p className="text-muted-foreground text-sm">
          Plan: <span className="text-foreground">{plan.name}</span>
          {plan.cycleLength > 0 && !ended ? <> · vuelta {plan.cycleNumber} del ciclo</> : null}
        </p>
        {range ? <p className="text-muted-foreground text-xs">{range}</p> : null}
      </header>

      {ended ? (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-4 text-center text-sm">
          Este plan terminó. Podés seguir mirando las sesiones, pero pedile a tu profe uno nuevo.
        </div>
      ) : plan.nextWorkoutId ? (
        <NextCard workout={plan.workouts.find((w) => w.id === plan.nextWorkoutId)!} />
      ) : null}

      {weekNumbers.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setWeek(n)}
              className={
                n === week
                  ? 'bg-primary text-primary-foreground shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium'
                  : 'border-border text-muted-foreground shrink-0 rounded-full border px-3.5 py-1.5 text-sm'
              }
            >
              Semana {n}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {daysOfWeek.map((w) => (
          <DayRow key={w.id} workout={w} highlight={w.id === plan.nextWorkoutId} />
        ))}
      </div>

      <Link
        href="/alumno/historial"
        className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-2 text-sm"
      >
        <History className="size-4" />
        Ver mi historial
      </Link>
    </>
  )
}

function NextCard({ workout }: { workout: StudentWorkout }) {
  return (
    <Link
      href={`/alumno/dia/${workout.id}`}
      className="border-primary/30 bg-primary/5 flex items-center gap-3 rounded-2xl border p-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-primary text-[11px] font-bold tracking-widest uppercase">Seguí por acá</p>
        <p className="truncate text-base font-semibold">{workout.name}</p>
        <p className="text-muted-foreground text-xs">
          Semana {workout.weekNumber} · {workout.exerciseCount} ejercicio
          {workout.exerciseCount === 1 ? '' : 's'}
          {workout.timesDone > 0 ? ` · hecha ${workout.timesDone}×` : ''}
        </p>
      </div>
      <ChevronRight className="text-primary size-5 shrink-0" />
    </Link>
  )
}

function DayRow({ workout, highlight }: { workout: StudentWorkout; highlight: boolean }) {
  return (
    <Link
      href={`/alumno/dia/${workout.id}`}
      className={
        'flex items-center gap-3 rounded-xl border p-3.5 transition-colors ' +
        (highlight ? 'border-primary/40' : 'border-border hover:bg-muted/50')
      }
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{workout.name}</p>
        <p className="text-muted-foreground text-xs">
          {workout.exerciseCount} ejercicio{workout.exerciseCount === 1 ? '' : 's'}
          {workout.estimatedMin ? ` · ~${workout.estimatedMin} min` : ''}
          {workout.timesDone > 0 ? ` · última vez ${relDate(workout.lastDoneAt)}` : ''}
        </p>
      </div>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  )
}
