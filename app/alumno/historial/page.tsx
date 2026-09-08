import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { StudentShell } from '@/components/student/student-shell'
import { getCurrentStudent, getStudentHistory } from '@/lib/supabase/queries/student-plan'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function StudentHistoryPage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const entries = await getStudentHistory(student.id)

  return (
    <StudentShell name={student.fullName} signOut={signOut}>
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
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.sessionId}>
              <Link
                href={`/alumno/dia/${e.workoutId}`}
                className="border-border hover:bg-muted/50 flex flex-col gap-0.5 rounded-xl border p-3.5"
              >
                <span className="text-sm font-medium">{e.workoutName}</span>
                <span className="text-muted-foreground text-xs">
                  {new Date(e.completedAt).toLocaleDateString()} · {e.loggedCount} registro
                  {e.loggedCount === 1 ? '' : 's'}
                </span>
                {e.feelingNote ? (
                  <span className="text-muted-foreground mt-1 text-xs italic">“{e.feelingNote}”</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StudentShell>
  )
}
