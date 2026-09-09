'use client'

import { useState, useTransition } from 'react'
import { Check, Dumbbell, Flame, Play, Plus, Repeat, Timer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMToLabel, formatSecToLabel } from '@/lib/prescription-format'
import { logExercise } from '@/app/alumno/actions'
import type { StudentDayItem } from '@/lib/supabase/queries/student-plan'

type SetForm = { setNumber: number; load: string; reps: string; saved: boolean }

export function StudentExerciseCard({
  workoutId,
  item,
  blockHasRounds,
  rounds,
}: {
  workoutId: string
  item: StudentDayItem
  blockHasRounds: boolean
  rounds: number | null
}) {
  const p = item.prescription
  const [showVideo, setShowVideo] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Pre-carga: reps desde la prescripción; carga con la última que el
  // alumno hizo en este ejercicio (vacío la primera vez).
  const prescribedReps = p?.reps ?? ''
  const lastLoadStr = item.lastLoadKg != null ? String(item.lastLoadKg) : ''

  function lastKnownLoad(list: SetForm[]): string {
    for (let k = list.length - 1; k >= 0; k--) {
      if (list[k].saved && list[k].load.trim() !== '') return list[k].load
    }
    return lastLoadStr
  }

  function freshSet(setNumber: number, list: SetForm[]): SetForm {
    return { setNumber, load: lastKnownLoad(list), reps: prescribedReps, saved: false }
  }

  const initial: SetForm[] =
    item.logs.length > 0
      ? item.logs.map((l) => ({
          setNumber: l.setNumber,
          load: l.loadKg == null ? '' : String(l.loadKg),
          reps: l.reps ?? '',
          saved: true,
        }))
      : [freshSet(1, [])]
  const [sets, setSets] = useState<SetForm[]>(initial)

  const prescribedSets = (() => {
    const m = p?.sets?.match(/\d+/)
    return m ? parseInt(m[0], 10) : 0
  })()
  const maxSetOption = Math.max(prescribedSets, sets.length + 1, 6)

  function patch(i: number, next: Partial<SetForm>) {
    setSets((prev) => prev.map((s, j) => (j === i ? { ...s, ...next, saved: false } : s)))
  }

  function save(i: number) {
    setError(null)
    const s = sets[i]
    startTransition(async () => {
      const res = await logExercise({
        workoutId,
        trainingItemId: item.id,
        setNumber: s.setNumber,
        loadKg: s.load.trim() === '' ? null : Number(s.load.replace(',', '.')) || null,
        reps: s.reps || null,
        comments: null,
      })
      if (res.error) setError(res.error)
      else setSets((prev) => prev.map((x, j) => (j === i ? { ...x, saved: true } : x)))
    })
  }

  const title = item.exerciseName ?? item.activityName ?? 'Ejercicio'
  const category = item.patternName ?? item.muscleName

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {item.label ? (
              <span className="bg-primary text-primary-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                {item.label}
              </span>
            ) : null}
            <div className="min-w-0">
              <h3 className="text-sm leading-tight font-semibold tracking-tight uppercase">{title}</h3>
              {category ? <p className="text-primary text-xs">{category}</p> : null}
            </div>
          </div>

          <div className="text-muted-foreground mt-2 space-y-1 text-xs">
            {blockHasRounds && rounds ? (
              <Row icon={<Repeat className="text-primary size-3.5" />} label="Vueltas" value={String(rounds)} />
            ) : p?.sets ? (
              <Row icon={<Dumbbell className="text-primary size-3.5" />} label="Series" value={p.sets} />
            ) : null}
            {p?.reps ? (
              <Row icon={<Repeat className="text-primary size-3.5" />} label="Reps" value={p.reps} />
            ) : null}
            {p?.loadKg != null ? (
              <Row icon={<Dumbbell className="text-primary size-3.5" />} label="Carga" value={`${p.loadKg} kg`} />
            ) : null}
            {p?.loadPercent != null ? (
              <Row icon={<Dumbbell className="text-primary size-3.5" />} label="%" value={`${p.loadPercent}%`} />
            ) : null}
            {p?.intensityRpe ? (
              <Row icon={<Flame className="text-primary size-3.5" />} label="Intensidad" value={p.intensityRpe} />
            ) : null}
            {p?.timeSec ? (
              <Row icon={<Timer className="text-primary size-3.5" />} label="Tiempo" value={formatSecToLabel(p.timeSec)} />
            ) : null}
            {p?.distanceM ? (
              <Row icon={<Timer className="text-primary size-3.5" />} label="Distancia" value={formatMToLabel(p.distanceM)} />
            ) : null}
            {p?.pace ? <Row icon={<Timer className="text-primary size-3.5" />} label="Ritmo" value={p.pace} /> : null}
            {p?.restLabel ? (
              <Row icon={<Timer className="text-primary size-3.5" />} label="Pausa" value={p.restLabel} />
            ) : null}
            {p?.notes ? <p className="pt-0.5 italic">{p.notes}</p> : null}
          </div>
        </div>

        {item.videoId ? (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className="relative block h-24 w-20 shrink-0 self-start overflow-hidden rounded-lg bg-black"
            aria-label="Ver video"
          >
            <img
              alt=""
              className="h-full w-full object-cover"
              src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
            />
            <span className="bg-primary text-primary-foreground absolute inset-0 m-auto flex size-8 items-center justify-center rounded-full">
              <Play className="size-3.5 translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        ) : null}
      </div>

      {showVideo && item.videoId ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${item.videoId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      <div className="border-border flex flex-col gap-2 border-t pt-3">
        {sets.map((s, i) => (
          <div key={i} className="flex items-end gap-1.5">
            <label className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px]">Vueltas</span>
              <select
                value={s.setNumber}
                onChange={(e) => patch(i, { setNumber: Number(e.target.value) })}
                className="border-input h-8 w-14 rounded-md border bg-transparent px-1.5 text-sm outline-none dark:bg-input/30"
              >
                {Array.from({ length: maxSetOption }, (_, k) => k + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px]">Carga kg</span>
              <Input
                inputMode="decimal"
                value={s.load}
                onChange={(e) => patch(i, { load: e.target.value })}
                className="h-8 w-16"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-[10px]">Reps</span>
              <Input
                value={s.reps}
                onChange={(e) => patch(i, { reps: e.target.value })}
                className="h-8 w-14"
              />
            </label>
            <Button
              size="sm"
              variant={s.saved ? 'outline' : 'default'}
              disabled={pending}
              onClick={() => save(i)}
              className="h-8 flex-1 px-2"
            >
              {s.saved ? <Check className="size-3.5" /> : null}
              {s.saved ? 'Guardado' : 'Registrar'}
            </Button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setSets((prev) => [...prev, freshSet((prev[prev.length - 1]?.setNumber ?? 0) + 1, prev)])
          }
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-xs"
        >
          <Plus className="size-3.5" />
          Agregar serie
        </button>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="text-foreground font-medium">{label}:</span> {value}
      </span>
    </div>
  )
}
