'use client'

import { useState, useTransition } from 'react'
import { Check, Dumbbell, Flame, Play, Repeat, Timer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMToLabel, formatSecToLabel } from '@/lib/prescription-format'
import { logExercise } from '@/app/alumno/actions'
import type { StudentDayItem } from '@/lib/supabase/queries/student-plan'

type DoneForm = { series: string; load: string; reps: string; saved: boolean }

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

  const prescribedSets = (() => {
    const m = p?.sets?.match(/\d+/)
    return m ? parseInt(m[0], 10) : 0
  })()
  const maxSeries = Math.max(prescribedSets, 12)
  const unit = 'Series'

  // Pre-carga: series desde la prescripción (o lo ya registrado); reps
  // desde la prescripción; carga con la última que el alumno hizo en este
  // ejercicio (vacío la primera vez).
  const first = item.logs[0]
  const initial: DoneForm =
    item.logs.length > 0
      ? {
          series: String(item.logs.length),
          load: first?.loadKg == null ? '' : String(first.loadKg),
          reps: first?.reps ?? '',
          saved: true,
        }
      : {
          series: String(prescribedSets || 1),
          load: item.lastLoadKg != null ? String(item.lastLoadKg) : '',
          reps: p?.reps ?? '',
          saved: false,
        }
  const [form, setForm] = useState<DoneForm>(initial)

  function patch(next: Partial<DoneForm>) {
    setForm((f) => ({ ...f, ...next, saved: false }))
  }

  // Resumen de lo que el alumno dejó registrado en este ejercicio para la
  // sesión en curso (lo que ve como "lo que hice", frente a la prescripción
  // de arriba que es "lo que toca").
  const savedSummary = [
    `${form.series} ${form.series === '1' ? 'serie' : 'series'}`,
    form.reps.trim() ? `${form.reps.trim()} reps` : null,
    form.load.trim() ? `${form.load.trim().replace(',', '.')} kg` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await logExercise({
        workoutId,
        trainingItemId: item.id,
        seriesCount: Number(form.series) || 1,
        loadKg: form.load.trim() === '' ? null : Number(form.load.replace(',', '.')) || null,
        reps: form.reps || null,
      })
      if (res.error) setError(res.error)
      else setForm((f) => ({ ...f, saved: true }))
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
              <Row icon={<Repeat className="text-primary size-3.5" />} label="Series" value={String(rounds)} />
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
        <p className="text-muted-foreground text-[11px]">Qué hiciste</p>
        <div className="flex items-end gap-1.5">
          <label className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[10px]">{unit}</span>
            <select
              value={form.series}
              onChange={(e) => patch({ series: e.target.value })}
              className="border-input h-8 w-14 rounded-md border bg-transparent px-1.5 text-sm outline-none dark:bg-input/30"
            >
              {Array.from({ length: maxSeries }, (_, k) => k + 1).map((n) => (
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
              value={form.load}
              onChange={(e) => patch({ load: e.target.value })}
              className="h-8 w-16"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[10px]">Reps</span>
            <Input
              value={form.reps}
              onChange={(e) => patch({ reps: e.target.value })}
              className="h-8 w-14"
            />
          </label>
          <Button
            size="sm"
            variant={form.saved ? 'outline' : 'default'}
            disabled={pending}
            onClick={save}
            className="h-8 flex-1 px-2"
          >
            {form.saved ? <Check className="size-3.5" /> : null}
            {form.saved ? 'Guardado' : 'Registrar'}
          </Button>
        </div>
        {form.saved ? (
          <p className="text-primary flex items-center gap-1 text-xs font-medium">
            <Check className="size-3.5 shrink-0" />
            Registrado: {savedSummary}
          </p>
        ) : item.lastLoadKg != null ? (
          <p className="text-muted-foreground text-[11px]">
            Última carga registrada: {item.lastLoadKg} kg
          </p>
        ) : null}
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
