import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { MonthCalendar, type CalendarItem } from '@/components/calendar/month-calendar'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getCalendarItems } from '@/lib/supabase/queries/competitions'
import { cancelRecurrenceOccurrence } from '@/app/alumnos/[studentId]/actions'

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

/** Calendario agregado del profesor (CLAUDE.md Fase 9 / §27): competencias
 *  y eventos de TODOS sus alumnos activos, RLS-scoped (is_professor_of). */
export default async function CalendarPage() {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const rows = await getCalendarItems()

  const items: CalendarItem[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    label: `${r.studentName} — ${TYPE_LABEL[r.type] ?? r.type}`,
    sublabel: [r.sportName, r.location, r.notes].filter(Boolean).join(' · ') || undefined,
    href: `/alumnos/${r.studentId}`,
    recurrenceId: r.recurrenceId,
  }))

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Calendario" />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Calendario</h1>
            <p className="text-muted-foreground text-xs">
              Competencias, tests, descanso y recuperación de todos tus alumnos — incluye series
              recurrentes (ej. "partido todos los domingos"). Tocá un día para ver el detalle;
              cargá cada ítem desde la ficha del alumno. Las ocurrencias de una serie se pueden
              cancelar una por una, sin borrar la serie entera.
            </p>
          </div>

          <MonthCalendar
            items={items}
            emptyLabel="Todavía no hay nada cargado en el calendario. Agregá competencias o eventos desde la ficha de cada alumno."
            onCancelOccurrence={cancelRecurrenceOccurrence}
          />
        </main>
      </div>
    </div>
  )
}
