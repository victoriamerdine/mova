import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { StudentDayContent } from '@/components/student/student-day-content'
import type { StudentDay } from '@/lib/supabase/queries/student-plan'

export function StudentDayScreen({ day }: { day: StudentDay }) {
  return (
    <>
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <header className="space-y-0.5">
        <p className="text-primary text-[11px] font-bold tracking-widest uppercase">
          {day.planName} · Semana {day.weekNumber}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{day.name}</h1>
        {day.objective ? <p className="text-muted-foreground text-sm">{day.objective}</p> : null}
      </header>

      <StudentDayContent day={day} />
    </>
  )
}
