'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Repeat, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { weekdayLabel } from '@/lib/calendar-recurrence'
import {
  createCompetition,
  createRecurringCompetition,
  deleteCompetition,
  deleteRecurrence,
} from '@/app/alumnos/[studentId]/actions'
import type { Competition, CompetitionRecurrence } from '@/lib/supabase/queries/competitions'

// El profesor solo carga manualmente estos tipos acá — entreno_preferido y
// otra_disciplina los escribe el alumno (calendario/formulario), no este
// formulario de alta manual.
type ManualCompetitionType = Exclude<Competition['type'], 'entreno_preferido' | 'otra_disciplina'>

const TYPE_OPTIONS: { value: ManualCompetitionType; label: string }[] = [
  { value: 'partido', label: 'Partido' },
  { value: 'carrera', label: 'Carrera' },
  { value: 'torneo', label: 'Torneo' },
  { value: 'campeonato', label: 'Campeonato' },
  { value: 'competencia', label: 'Competencia' },
  { value: 'test', label: 'Test' },
  { value: 'evento', label: 'Evento' },
  { value: 'descanso', label: 'Descanso' },
  { value: 'recuperacion', label: 'Recuperación' },
]

const WEEKDAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map((w) => ({ value: w, label: weekdayLabel(w) }))

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
}

export function CompetitionsCard({
  studentId,
  sports,
  competitions,
  recurrences,
}: {
  studentId: string
  sports: { id: string; name: string }[]
  competitions: Competition[]
  recurrences: CompetitionRecurrence[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [recurring, setRecurring] = useState(false)
  const [sportId, setSportId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [weekday, setWeekday] = useState(0)
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState<ManualCompetitionType>('partido')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = recurring
        ? await createRecurringCompetition(studentId, {
            sportId,
            type,
            weekday,
            location,
            notes,
            startDate: date,
            endDate,
          })
        : await createCompetition(studentId, { sportId, date, type, location, notes })
      if (res.error) {
        setError(res.error)
        return
      }
      setLocation('')
      setNotes('')
      setDate(todayISO())
      setEndDate('')
      router.refresh()
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteCompetition(studentId, id)
      router.refresh()
    })
  }

  function removeRecurrence(id: string) {
    startTransition(async () => {
      await deleteRecurrence(studentId, id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p> : null}

      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="accent-primary size-3.5"
        />
        <Repeat className="text-muted-foreground size-3.5" />
        Se repite cada semana
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Deporte (opcional)</span>
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
          >
            <option value="">—</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ManualCompetitionType)}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {recurring ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Día de la semana</span>
              <select
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
                className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
              >
                {WEEKDAY_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Desde</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Hasta (opcional)</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Fecha</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </label>
        )}

        <label className="flex min-w-32 flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Lugar (opcional)</span>
          <Input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="flex min-w-32 flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Nota (opcional)</span>
          <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <Button size="sm" className="h-8" disabled={pending || !date} onClick={submit}>
          <Plus data-icon="inline-start" />
          {pending ? 'Guardando…' : 'Agregar'}
        </Button>
      </div>

      {recurrences.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">Series recurrentes</p>
          <ul className="divide-border divide-y">
            {recurrences.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                <Repeat className="text-muted-foreground size-3.5 shrink-0" />
                <span className="font-medium capitalize">{r.type}</span>
                <span className="text-muted-foreground text-xs">
                  todos los {weekdayLabel(r.weekday).toLowerCase()}
                  {r.endDate ? ` · hasta ${formatDate(r.endDate)}` : ''}
                </span>
                {r.sportName ? <span className="text-muted-foreground text-xs">{r.sportName}</span> : null}
                <button
                  type="button"
                  onClick={() => removeRecurrence(r.id)}
                  disabled={pending}
                  aria-label="Borrar serie recurrente"
                  className="text-muted-foreground hover:text-destructive ml-auto flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {competitions.length === 0 ? (
        <p className="text-muted-foreground text-xs">Todavía no cargaste nada en el calendario.</p>
      ) : (
        <ul className="divide-border divide-y">
          {competitions.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="text-muted-foreground w-24 shrink-0 text-xs">{formatDate(c.date)}</span>
              <span className="font-medium capitalize">{c.type}</span>
              {c.sportName ? <span className="text-muted-foreground text-xs">{c.sportName}</span> : null}
              {c.location ? (
                <span className="text-muted-foreground truncate text-xs">{c.location}</span>
              ) : null}
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={pending}
                aria-label="Borrar competencia"
                className="text-muted-foreground hover:text-destructive ml-auto flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
