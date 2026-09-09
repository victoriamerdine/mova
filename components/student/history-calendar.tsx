'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'

import { DIFFICULTY_LABEL } from '@/lib/student-difficulty'
import type { StudentHistoryEntry } from '@/lib/supabase/queries/student-plan'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function HistoryCalendar({ entries }: { entries: StudentHistoryEntry[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  // Sesiones agrupadas por día local del alumno.
  const byDay = new Map<string, StudentHistoryEntry[]>()
  for (const e of entries) {
    const k = dayKey(new Date(e.completedAt))
    const list = byDay.get(k)
    if (list) list.push(e)
    else byDay.set(k, [e])
  }

  // Meses con al menos una sesión, del más nuevo al más viejo.
  const months = [...new Set([...byDay.keys()].map((k) => k.split('-').slice(0, 2).join('-')))]
    .map((k) => k.split('-').map(Number) as [number, number])
    .sort(([ay, am], [zy, zm]) => zy - ay || zm - am)

  const todayKey = dayKey(new Date())

  return (
    <div className="flex flex-col gap-6">
      {months.map(([year, month]) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7 // lunes = 0
        const cells: (number | null)[] = [
          ...Array<null>(firstOffset).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ]
        while (cells.length % 7 !== 0) cells.push(null)
        const weeks: (number | null)[][] = []
        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

        const title = capitalize(
          new Date(year, month, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' }),
        )

        return (
          <div key={`${year}-${month}`} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w, i) => (
                <span
                  key={i}
                  className="text-muted-foreground pb-1 text-center text-[11px] font-medium"
                >
                  {w}
                </span>
              ))}

              {weeks.map((week, wi) => {
                const selCol = week.findIndex(
                  (d) => d != null && `${year}-${month}-${d}` === selected,
                )
                return (
                  <Fragment key={wi}>
                    {week.map((d, di) => {
                      if (d == null) return <span key={di} />
                      const k = `${year}-${month}-${d}`
                      const sessions = byDay.get(k)
                      const isToday = k === todayKey
                      const isSel = k === selected

                      if (!sessions) {
                        return (
                          <span
                            key={di}
                            className={
                              'flex aspect-square items-center justify-center rounded-lg text-sm ' +
                              (isToday
                                ? 'text-foreground ring-border font-semibold ring-1'
                                : 'text-muted-foreground')
                            }
                          >
                            {d}
                          </span>
                        )
                      }

                      return (
                        <button
                          key={di}
                          type="button"
                          onClick={() => setSelected(isSel ? null : k)}
                          aria-label={`${d}: ${sessions.length} sesión${sessions.length === 1 ? '' : 'es'}`}
                          className={
                            'relative flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition-colors ' +
                            (isSel
                              ? 'bg-primary text-primary-foreground ring-primary ring-2'
                              : 'bg-primary/15 text-primary hover:bg-primary/25')
                          }
                        >
                          {d}
                          {sessions.length > 1 ? (
                            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none">
                              {sessions.length}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}

                    {selCol >= 0 ? (
                      <div style={{ gridColumn: '1 / -1' }} className="relative pt-2">
                        <span
                          className="border-border bg-card absolute -top-0.5 size-2.5 rotate-45 border-t border-l"
                          style={{ left: `calc(${((selCol + 0.5) / 7) * 100}% - 5px)` }}
                        />
                        <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium">
                              {new Date(year, month, Number(selected!.split('-')[2])).toLocaleDateString(
                                'es',
                                { weekday: 'long', day: 'numeric', month: 'long' },
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelected(null)}
                              className="text-muted-foreground hover:text-foreground -m-1 p-1"
                              aria-label="Cerrar"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          {(byDay.get(selected!) ?? []).map((e) => (
                            <Link
                              key={e.sessionId}
                              href={`/alumno/dia/${e.workoutId}`}
                              className="hover:bg-muted/50 -mx-1 flex flex-col gap-0.5 rounded-lg px-1 py-1"
                            >
                              <span className="flex items-center gap-1 text-sm font-medium">
                                {e.workoutName}
                                <ArrowRight className="text-muted-foreground size-3.5" />
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {e.loggedCount} registro{e.loggedCount === 1 ? '' : 's'}
                                {e.difficulty ? ` · ${DIFFICULTY_LABEL[e.difficulty]}` : ''}
                              </span>
                              {e.feelingNote ? (
                                <span className="text-muted-foreground text-xs italic">
                                  “{e.feelingNote}”
                                </span>
                              ) : null}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
