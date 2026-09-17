import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { StudentShell } from '@/components/student/student-shell'
import { getCurrentStudent } from '@/lib/supabase/queries/student-plan'
import { getMySubmissions } from '@/lib/supabase/queries/forms'
import { signOut } from '@/app/login/actions'

const STATUS_LABEL: Record<string, string> = {
  started: 'En curso',
  completed: 'Completado',
}

export const dynamic = 'force-dynamic'

/** "El alumno puede ver las respuestas de su formulario en una sección formularios." */
export default async function StudentFormsPage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const submissions = await getMySubmissions(student.id)

  return (
    <StudentShell signOut={signOut}>
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Mis formularios</h1>
      <p className="text-muted-foreground text-xs">Los formularios que respondiste.</p>

      {submissions.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Todavía no respondiste ningún formulario.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/alumno/formularios/${s.id}`}
                className="border-border bg-card hover:bg-muted/50 flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors"
              >
                <span>
                  <span className="block text-sm font-semibold">{s.formName}</span>
                  <span className="text-muted-foreground block text-xs">
                    {s.answered}/{s.total} respondidas ·{' '}
                    {new Date(s.completedAt ?? s.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StudentShell>
  )
}
