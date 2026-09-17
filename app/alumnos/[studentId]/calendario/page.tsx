import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { MinimalHeader } from '@/components/minimal-header'
import { MonthCalendar, type CalendarItem } from '@/components/calendar/month-calendar'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getStudentCalendarItems } from '@/lib/supabase/queries/competitions'
import { fmtTime } from '@/lib/calendar-recurrence'
import { markScheduleViewed } from '@/app/alumnos/[studentId]/actions'

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

/**
 * "El profesor puede ver el calendario tal cual lo ve el alumno" — mismo
 * componente que /alumno/calendario, en modo lectura, con los datos del
 * alumno (RLS is_professor_of ya los recorta).
 */
export default async function StudentCalendarForProfessorPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { studentId } = await params

  // Fire-and-forget: mirar el calendario del alumno apaga el aviso de
  // "cambió sus días" en la campanita, sin bloquear el render.
  void markScheduleViewed(studentId)

  const supabase = await createClient()
  const { data: studentRow } = await supabase
    .from('students')
    .select('id, profiles(full_name)')
    .eq('id', studentId)
    .maybeSingle()
  const studentName =
    (studentRow as unknown as { profiles: { full_name: string } | null } | null)?.profiles
      ?.full_name ?? 'Alumno'

  const rows = await getStudentCalendarItems(studentId)
  const items: CalendarItem[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    label: TYPE_LABEL[r.type] ?? r.type,
    sublabel:
      [fmtTime(r.time), r.sportName, r.location, r.notes].filter(Boolean).join(' · ') || undefined,
    recurrenceId: r.recurrenceId,
  }))

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <MinimalHeader title={`Calendario de ${studentName}`} fullName={professor.fullName} />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        <Link
          href={`/alumnos/${studentId}`}
          className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Volver a la ficha
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Calendario de {studentName}</h1>
        <p className="text-muted-foreground text-xs">
          Tal cual lo ve el alumno: lo que cargaste vos más sus días de entreno preferido y otras
          disciplinas.
        </p>
        <MonthCalendar items={items} emptyLabel="Todavía no tiene nada cargado en el calendario." />
      </main>
    </div>
  )
}
