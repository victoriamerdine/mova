import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { MonthCalendar, type CalendarItem } from '@/components/calendar/month-calendar'
import { StudentShell } from '@/components/student/student-shell'
import { getCurrentStudent } from '@/lib/supabase/queries/student-plan'
import { getStudentCalendarItems } from '@/lib/supabase/queries/competitions'
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
}

export const dynamic = 'force-dynamic'

export default async function StudentCalendarPage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const rows = await getStudentCalendarItems(student.id)

  const items: CalendarItem[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    label: TYPE_LABEL[r.type] ?? r.type,
    sublabel: [r.sportName, r.location, r.notes].filter(Boolean).join(' · ') || undefined,
  }))

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
        Partidos, carreras, tests, descanso y recuperación que cargó tu profesor. Tocá un día para
        ver el detalle.
      </p>

      <MonthCalendar items={items} emptyLabel="Todavía no tenés nada cargado en el calendario." />
    </StudentShell>
  )
}
