import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { HistoryCalendar } from '@/components/student/history-calendar'
import { StudentShell } from '@/components/student/student-shell'
import { getCurrentStudent, getStudentHistory } from '@/lib/supabase/queries/student-plan'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function StudentHistoryPage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const entries = await getStudentHistory(student.id)

  return (
    <StudentShell signOut={signOut}>
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Mi historial</h1>

      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Todavía no completaste ninguna sesión.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            Los días marcados son los que entrenaste. Tocá uno para ver el resumen.
          </p>
          <HistoryCalendar entries={entries} />
        </>
      )}
    </StudentShell>
  )
}
