import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABELS_SHORT, fmtTime } from '@/lib/calendar-recurrence'
import type { SnapshotQuestion, WeeklyScheduleDay } from '@/lib/forms/types'

function formatWeeklySchedule(value: unknown): string {
  const days = Array.isArray(value) ? (value as WeeklyScheduleDay[]) : []
  if (days.length === 0) return '—'
  return days
    .slice()
    .sort((a, b) => WEEKDAY_DISPLAY_ORDER.indexOf(a.weekday) - WEEKDAY_DISPLAY_ORDER.indexOf(b.weekday))
    .map((d) => `${WEEKDAY_LABELS_SHORT[d.weekday]}${d.time ? ` ${fmtTime(d.time)}` : ''}`)
    .join(', ')
}

/**
 * Formatea una respuesta para mostrarla en texto — la usan tanto el
 * builder/respuestas del profesor (`<SubmissionDetail>`) como la vista de
 * solo lectura del alumno (`/alumno/formularios/[id]`), un Server
 * Component que no puede importar nada de un módulo `'use client'`.
 */
export function formatAnswer(q: SnapshotQuestion, value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (q.type === 'weekly_schedule') return formatWeeklySchedule(value)
  if (Array.isArray(value)) {
    return value
      .map((v) => q.options.find((o) => o.value === v)?.label ?? String(v))
      .join(', ')
  }
  if (typeof value === 'object' && value && 'path' in value && 'filename' in value) {
    return String((value as { filename: string }).filename)
  }
  if (typeof value === 'object' && 'value' in value) {
    const o = value as { value: unknown; unit?: string }
    return `${o.value} ${o.unit ?? ''}`.trim()
  }
  if (q.type === 'single_select') {
    return q.options.find((o) => o.value === value)?.label ?? String(value)
  }
  if (q.type === 'birth_date' && typeof value === 'string') {
    const age = Math.floor((Date.now() - new Date(value).getTime()) / 31_557_600_000)
    return Number.isFinite(age) && age > 0 && age < 130 ? `${value} (${age} años)` : String(value)
  }
  return String(value)
}
