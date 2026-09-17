import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { MonthCalendar, type CalendarItem } from '@/components/calendar/month-calendar'
import { MyScheduleEditor } from '@/components/student/my-schedule-editor'
import { StudentShell } from '@/components/student/student-shell'
import { getCurrentStudent } from '@/lib/supabase/queries/student-plan'
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

export const dynamic = 'force-dynamic'

export default async function StudentCalendarPage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const [rows, recurrences] = await Promise.all([
    getStudentCalendarItems(student.id),
    getStudentRecurrences(student.id),
  ])

  const items: CalendarItem[] = rows.map((r) => ({
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
        Partidos, carreras, tests, descanso y recuperación que cargó tu profesor, más tus días de
        entreno preferido y de otras disciplinas. Tocá un día para ver el detalle.
      </p>

      <MonthCalendar items={items} emptyLabel="Todavía no tenés nada cargado en el calendario." />

      <MyScheduleEditor preferredDays={preferredDays} otherDisciplineDays={otherDisciplineDays} />
    </StudentShell>
  )
}
