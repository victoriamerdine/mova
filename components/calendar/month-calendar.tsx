'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { addMonths, buildMonthGrid, dateKey, monthTitle } from '@/lib/calendar-grid'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export type CalendarItem = {
  id: string
  /** "YYYY-MM-DD" */
  date: string
  label: string
  sublabel?: string
  href?: string
  /** Color del punto/badge — por defecto usa el color primario. */
  tone?: 'primary' | 'muted'
  /** Presente si es una ocurrencia de una serie recurrente — habilita "Cancelar esta fecha". */
  recurrenceId?: string
}

function todayKey() {
  const d = new Date()
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Calendario mensual genérico (CLAUDE.md §9/§27): navega mes a mes, marca
 * los días con al menos un ítem y muestra el detalle del día seleccionado
 * debajo. No asume de qué son los ítems — el caller decide (competencias,
 * eventos, sesiones…).
 */
export function MonthCalendar({
  items,
  emptyLabel = 'Nada cargado todavía.',
  onCancelOccurrence,
}: {
  items: CalendarItem[]
  emptyLabel?: string
  /** Si se pasa, los ítems con `recurrenceId` muestran un botón "Cancelar esta fecha". */
  onCancelOccurrence?: (recurrenceId: string, date: string) => Promise<{ error: string | null } | void>
}) {
  const router = useRouter()
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleCancel(item: CalendarItem) {
    if (!onCancelOccurrence || !item.recurrenceId) return
    setPendingId(item.id)
    startTransition(async () => {
      await onCancelOccurrence(item.recurrenceId!, item.date)
      setPendingId(null)
      setSelected(null)
      router.refresh()
    })
  }

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const list = map.get(item.date)
      if (list) list.push(item)
      else map.set(item.date, [item])
    }
    return map
  }, [items])

  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor.year, cursor.month])
  const tKey = todayKey()

  if (items.length === 0) {
    return <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setCursor((c) => addMonths(c.year, c.month, -1))
            setSelected(null)
          }}
          aria-label="Mes anterior"
          className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-sm font-semibold tracking-tight">{monthTitle(cursor.year, cursor.month)}</h2>
        <button
          type="button"
          onClick={() => {
            setCursor((c) => addMonths(c.year, c.month, 1))
            setSelected(null)
          }}
          aria-label="Mes siguiente"
          className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-muted-foreground pb-1 text-center text-[11px] font-medium">
            {w}
          </span>
        ))}

        {weeks.map((week, wi) => {
          const selCol = week.findIndex((c) => c != null && c.dateKey === selected)
          return (
            <Fragment key={wi}>
              {week.map((cell, di) => {
                if (cell == null) return <span key={di} />
                const dayItems = byDate.get(cell.dateKey)
                const isToday = cell.dateKey === tKey
                const isSel = cell.dateKey === selected

                if (!dayItems) {
                  return (
                    <span
                      key={di}
                      className={
                        'flex aspect-square items-center justify-center rounded-lg text-sm ' +
                        (isToday ? 'text-foreground ring-border font-semibold ring-1' : 'text-muted-foreground')
                      }
                    >
                      {cell.day}
                    </span>
                  )
                }

                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => setSelected(isSel ? null : cell.dateKey)}
                    aria-label={`${cell.day}: ${dayItems.length} ítem${dayItems.length === 1 ? '' : 's'}`}
                    className={
                      'relative flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition-colors ' +
                      (isSel
                        ? 'bg-primary text-primary-foreground ring-primary ring-2'
                        : 'bg-primary/15 text-primary hover:bg-primary/25')
                    }
                  >
                    {cell.day}
                    {dayItems.length > 1 ? (
                      <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none">
                        {dayItems.length}
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
                        {new Date(cursor.year, cursor.month, Number(selected!.split('-')[2])).toLocaleDateString(
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
                    {(byDate.get(selected!) ?? []).map((item) => {
                      const content = (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.sublabel ? (
                            <span className="text-muted-foreground text-xs">{item.sublabel}</span>
                          ) : null}
                        </>
                      )
                      const canCancel = onCancelOccurrence && item.recurrenceId
                      return (
                        <div key={item.id} className="flex items-start gap-2">
                          {item.href ? (
                            <Link
                              href={item.href}
                              className="hover:bg-muted/50 -mx-1 flex flex-1 flex-col gap-0.5 rounded-lg px-1 py-1"
                            >
                              {content}
                            </Link>
                          ) : (
                            <div className="flex flex-1 flex-col gap-0.5 px-1 py-1">{content}</div>
                          )}
                          {canCancel ? (
                            <button
                              type="button"
                              onClick={() => handleCancel(item)}
                              disabled={pendingId === item.id}
                              className="text-muted-foreground hover:text-destructive shrink-0 self-center text-[11px] underline underline-offset-2 disabled:opacity-50"
                            >
                              {pendingId === item.id ? 'Cancelando…' : 'Cancelar'}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
