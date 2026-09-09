'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, History } from 'lucide-react'

import { StudentDayContent } from '@/components/student/student-day-content'
import type { StudentPlanSummary, StudentWeek } from '@/lib/supabase/queries/student-plan'

function chip(active: boolean) {
  return active
    ? 'bg-primary text-primary-foreground shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium'
    : 'border-border text-muted-foreground hover:text-foreground shrink-0 rounded-full border px-3.5 py-1.5 text-sm'
}

export function StudentWeekView({
  studentName,
  plans,
  activePlanId,
  week,
}: {
  studentName: string
  plans: StudentPlanSummary[]
  activePlanId: string
  week: StudentWeek | null
}) {
  const router = useRouter()
  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0]

  const [view, setView] = useState<'dia' | 'semana'>('dia')
  const [tab, setTab] = useState(0)

  // Al recibir una semana nueva (cambio de plan/semana), plantar la tab en
  // "seguí por acá" si ese día está en la semana visible, si no en la primera.
  useEffect(() => {
    if (!week) return
    const idx = week.days.findIndex((d) => d.workoutId === week.nextWorkoutId)
    setTab(idx >= 0 ? idx : 0)
  }, [week?.weekNumber, activePlanId, week])

  function go(next: { plan?: string; week?: number }) {
    const params = new URLSearchParams()
    params.set('plan', next.plan ?? activePlanId)
    if (next.week) params.set('week', String(next.week))
    router.push(`/alumno?${params.toString()}`)
  }

  const range =
    activePlan.startDate && activePlan.endDate
      ? `${new Date(activePlan.startDate).toLocaleDateString()} – ${new Date(activePlan.endDate).toLocaleDateString()}`
      : null
  const ended = activePlan.endDate
    ? new Date(activePlan.endDate) < new Date(new Date().toDateString())
    : false

  return (
    <>
      <header className="space-y-1">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Tu entrenamiento</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hola {studentName.split(' ')[0]}</h1>
        <p className="text-muted-foreground text-sm">
          {plans.length === 1 ? (
            <>
              Plan: <span className="text-foreground">{activePlan.name}</span>
            </>
          ) : null}
          {week && !ended ? (
            <>
              {plans.length === 1 ? ' · ' : ''}
              vuelta {week.cycleNumber} del ciclo
            </>
          ) : null}
        </p>
        {range ? <p className="text-muted-foreground text-xs">{range}</p> : null}
      </header>

      {plans.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => go({ plan: p.id })}
              className={chip(p.id === activePlanId)}
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {ended ? (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-4 text-center text-sm">
          Este plan terminó. Podés seguir mirando las sesiones, pero pedile a tu profe uno nuevo.
        </div>
      ) : null}

      {!week ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Este plan todavía no tiene semanas ni sesiones cargadas.
        </p>
      ) : (
        <>
          {week.weekNumbers.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {week.weekNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => go({ week: n })}
                  className={chip(n === week.weekNumber)}
                >
                  Semana {n}
                </button>
              ))}
            </div>
          ) : null}

          <WeekSummary week={week} />

          <div className="border-border flex gap-1 rounded-full border p-1">
            {(['dia', 'semana'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={
                  'flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ' +
                  (view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')
                }
              >
                {v === 'dia' ? 'Por día' : 'Semana completa'}
              </button>
            ))}
          </div>

          {view === 'dia' ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {week.days.map((d, i) => (
                  <button
                    key={d.workoutId}
                    type="button"
                    onClick={() => setTab(i)}
                    className={chip(i === tab) + ' inline-flex items-center gap-1'}
                  >
                    {d.name}
                    <DayChecks
                      times={d.timesDone}
                      active={i === tab}
                    />
                  </button>
                ))}
              </div>
              {week.days[tab] ? (
                <StudentDayContent key={week.days[tab].workoutId} day={week.days[tab]} />
              ) : null}
            </>
          ) : (
            <WeekOverview week={week} />
          )}
        </>
      )}

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

function DayChecks({ times, active }: { times: number; active: boolean }) {
  if (times <= 0) return null
  const cls = active ? 'text-primary-foreground' : 'text-primary'
  if (times <= 3) {
    return (
      <span className={`inline-flex ${cls}`}>
        {Array.from({ length: times }).map((_, i) => (
          <Check key={i} className="size-3.5" strokeWidth={3} />
        ))}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center ${cls}`}>
      <Check className="size-3.5" strokeWidth={3} />
      <span className="text-[11px] font-bold">×{times}</span>
    </span>
  )
}

/** Vista "Semana completa": solo lectura — qué se trabaja cada día. */
function WeekOverview({ week }: { week: StudentWeek }) {
  return (
    <div className="flex flex-col gap-6">
      {week.days.map((d) => {
        const items = d.blocks.flatMap((b) => b.items)
        return (
          <div key={d.workoutId} className="flex flex-col gap-2">
            <h2 className="text-primary flex items-center gap-2 text-base font-semibold tracking-tight uppercase">
              {d.name}
              <DayChecks times={d.timesDone} active={false} />
            </h2>
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin ejercicios cargados.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {items.map((it) => (
                  <li key={it.id} className="flex gap-2">
                    <span className="text-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                    <span>
                      <span className="font-medium">
                        {it.label ? `${it.label} · ` : ''}
                        {it.exerciseName ?? it.activityName ?? 'Ejercicio'}
                      </span>
                      {it.patternName || it.muscleName ? (
                        <span className="text-muted-foreground">
                          {' — '}
                          {it.patternName ?? it.muscleName}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

function WeekSummary({ week }: { week: StudentWeek }) {
  const s = week.summary
  if (s.exerciseCount === 0) return null
  return (
    <details className="border-border bg-card rounded-2xl border p-4" open>
      <summary className="cursor-pointer list-none text-sm font-medium">
        Semana {week.weekNumber}: {s.dayCount} día{s.dayCount === 1 ? '' : 's'} · {s.exerciseCount}{' '}
        ejercicio{s.exerciseCount === 1 ? '' : 's'}
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-xs">
        {s.patterns.length > 0 ? (
          <Tallies title="Patrones" items={s.patterns} />
        ) : null}
        {s.muscles.length > 0 ? <Tallies title="Músculos" items={s.muscles} /> : null}
        {s.exercises.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-1 font-semibold tracking-wide uppercase">
              Ejercicios
            </p>
            <p className="text-foreground/90">{s.exercises.join(' · ')}</p>
          </div>
        ) : null}
      </div>
    </details>
  )
}

function Tallies({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 font-semibold tracking-wide uppercase">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it.name}
            className="border-border text-foreground/90 rounded-full border px-2 py-0.5"
          >
            {it.name} <span className="text-muted-foreground">×{it.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
