import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { MonthCalendar, type CalendarItem } from '@/components/calendar/month-calendar'
import { MyScheduleEditor } from '@/components/student/my-schedule-editor'
import { StudentShell } from '@/components/student/student-shell'
import { DIFFICULTY_LABEL } from '@/lib/student-difficulty'
import { getCurrentStudent, getStudentHistory } from '@/lib/supabase/queries/student-plan'
import { getStudentCalendarItems, getStudentRecurrences } from '@/lib/supabase/queries/competitions'
import { fmtTime } from '@/lib/calendar-recurrence'
import { signOut } from '@/app/login/actions'

const TYPE_LABEL: Record<string, string> = {
  partido: 'Partido',
  carrera: 'Carrera',
  torneo: 'Torneo',
  campeonato: 'Campeonato',
  competencia: 'Competencia',
  test: 'Test',
  evento: 'Evento',
  descanso: 'Descanso',
  recuperacion: 'Recuperación',
  entreno_preferido: 'Entreno acá',
  otra_disciplina: 'Otra disciplina',
}

/** "45 min" o "1 h 5 min". */
function fmtDuration(totalSec: number) {
  const totalMin = Math.max(1, Math.round(totalSec / 60))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export const dynamic = 'force-dynamic'

/**
 * Calendario consolidado del alumno: eventos/competencias que cargó el
 * profesor (Fase 9) + sus propios días de entreno preferido / otra
 * disciplina (editables acá mismo) + lo que realmente entrenó, de TODOS
 * sus planes (`getStudentHistory` ya no filtra por plan — reemplaza a la
 * vista separada que tenía /alumno/historial).
 */
export default async function StudentCalendarPage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const [eventRows, recurrences, historyRows] = await Promise.all([
    getStudentCalendarItems(student.id),
    getStudentRecurrences(student.id),
    getStudentHistory(student.id),
  ])

  const eventItems: CalendarItem[] = eventRows.map((r) => ({
    id: r.id,
    date: r.date,
    label: TYPE_LABEL[r.type] ?? r.type,
    sublabel:
      [fmtTime(r.time), r.sportName, r.location, r.notes].filter(Boolean).join(' · ') || undefined,
    recurrenceId: r.recurrenceId,
  }))

  const preferredDays = recurrences
    .filter((r) => r.type === 'entreno_preferido')
    .map((r) => ({ weekday: r.weekday, time: r.time }))
  const otherDisciplineDays = recurrences
    .filter((r) => r.type === 'otra_disciplina')
    .map((r) => ({ weekday: r.weekday, time: r.time }))

  const historyItems: CalendarItem[] = historyRows.map((h) => ({
    id: h.sessionId,
    date: '',
    completedAtRaw: h.completedAt,
    label: `Hiciste: ${h.workoutName}`,
    sublabel: [
      h.durationSec != null ? fmtDuration(h.durationSec) : null,
      `${h.loggedCount} registro${h.loggedCount === 1 ? '' : 's'}`,
      h.difficulty ? DIFFICULTY_LABEL[h.difficulty] : null,
      h.feelingNote ? `"${h.feelingNote}"` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    href: `/alumno/dia/${h.workoutId}`,
    tone: 'muted',
  }))

  const items = [...eventItems, ...historyItems]

  return (
    <StudentShell signOut={signOut}>
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Mi calendario</h1>
      <p className="text-muted-foreground text-xs">
        Lo que cargó tu profesor (partidos, tests, descanso…), tus días de entreno preferido y de
        otras disciplinas, y lo que realmente entrenaste, de todos tus planes. Tocá un día para ver
        el detalle.
      </p>

      <MonthCalendar items={items} emptyLabel="Todavía no tenés nada en el calendario." />

      <MyScheduleEditor preferredDays={preferredDays} otherDisciplineDays={otherDisciplineDays} />
    </StudentShell>
  )
}
