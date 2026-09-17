'use client'

import { useState, useTransition } from 'react'

import { updateMySchedule } from '@/app/alumno/actions'
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABELS_SHORT, fmtTime } from '@/lib/calendar-recurrence'

type Day = { weekday: number; time: string | null }

/**
 * El alumno edita sus propios días de entreno preferido / otra disciplina
 * (los mismos que puede haber declarado en un formulario — ver
 * lib/forms/question-types.ts#weekly_schedule). Guardar avisa al profesor
 * por la campanita (updateMySchedule marca students.schedule_updated_at).
 */
export function MyScheduleEditor({
  preferredDays,
  otherDisciplineDays,
}: {
  preferredDays: Day[]
  otherDisciplineDays: Day[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <ScheduleSection
        purpose="entreno_preferido"
        title="Mis días de entreno preferidos"
        helpText="Los días que preferís entrenar acá — se lo mostramos a tu profe."
        initialDays={preferredDays}
      />
      <ScheduleSection
        purpose="otra_disciplina"
        title="Otras disciplinas"
        helpText="Días que entrenás otro deporte o actividad — le sirve a tu profe para planificar."
        initialDays={otherDisciplineDays}
      />
    </div>
  )
}

function ScheduleSection({
  purpose,
  title,
  helpText,
  initialDays,
}: {
  purpose: 'entreno_preferido' | 'otra_disciplina'
  title: string
  helpText: string
  initialDays: Day[]
}) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<Day[]>(
    initialDays.map((d) => ({ weekday: d.weekday, time: fmtTime(d.time) })),
  )
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function dayFor(weekday: number) {
    return days.find((d) => d.weekday === weekday) ?? null
  }
  function toggle(weekday: number, checked: boolean) {
    setDays(checked ? [...days, { weekday, time: null }] : days.filter((d) => d.weekday !== weekday))
  }
  function setTime(weekday: number, time: string) {
    setDays(days.map((d) => (d.weekday === weekday ? { ...d, time: time || null } : d)))
  }

  const summary =
    initialDays.length === 0
      ? 'Sin días cargados'
      : initialDays
          .slice()
          .sort((a, b) => WEEKDAY_DISPLAY_ORDER.indexOf(a.weekday) - WEEKDAY_DISPLAY_ORDER.indexOf(b.weekday))
          .map((d) => `${WEEKDAY_LABELS_SHORT[d.weekday]}${d.time ? ` ${fmtTime(d.time)}` : ''}`)
          .join(', ')

  return (
    <div className="border-border rounded-2xl border p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="text-muted-foreground block text-xs">{summary}</span>
        </span>
        <span className="text-muted-foreground text-xs">{open ? 'Cerrar' : 'Editar'}</span>
      </button>

      {open ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">{helpText}</p>
          {msg ? <p className="text-primary text-xs">{msg}</p> : null}
          {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
            const cur = dayFor(weekday)
            return (
              <div
                key={weekday}
                className="border-input flex items-center gap-3 rounded-xl border px-3 py-2"
              >
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cur != null}
                    onChange={(e) => toggle(weekday, e.target.checked)}
                  />
                  {WEEKDAY_LABELS_SHORT[weekday]}
                </label>
                {cur ? (
                  <input
                    type="time"
                    value={cur.time ?? ''}
                    onChange={(e) => setTime(weekday, e.target.value)}
                    className="border-input h-7 rounded-md border bg-transparent px-1.5 text-sm outline-none dark:bg-input/30"
                  />
                ) : null}
              </div>
            )
          })}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setMsg(null)
                const res = await updateMySchedule(purpose, days)
                if (res.error) setMsg(res.error)
                else {
                  setMsg('Guardado — le avisamos a tu profe.')
                  setOpen(false)
                }
              })
            }
            className="bg-primary text-primary-foreground mt-1 w-fit rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
