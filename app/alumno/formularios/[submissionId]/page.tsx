import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Paperclip } from 'lucide-react'

import { StudentShell } from '@/components/student/student-shell'
import { formatAnswer } from '@/components/forms/submission-detail'
import { getCurrentStudent } from '@/lib/supabase/queries/student-plan'
import { getSubmissionDetail } from '@/lib/supabase/queries/forms'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

/** Respuestas de un formulario propio, de solo lectura — no la vista de edición del profesor. */
export default async function StudentSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const { submissionId } = await params
  const detail = await getSubmissionDetail(submissionId)
  if (!detail || detail.studentId !== student.id) notFound()

  return (
    <StudentShell signOut={signOut}>
      <Link
        href="/alumno/formularios"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">{detail.formName}</h1>
      <p className="text-muted-foreground text-xs">
        {detail.completedAt
          ? `Completado el ${new Date(detail.completedAt).toLocaleString()}`
          : `Enviado el ${new Date(detail.createdAt).toLocaleString()}`}
      </p>

      <div className="flex flex-col gap-4">
        {detail.structure.sections.map((section) => (
          <div key={section.id}>
            {section.title ? (
              <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                {section.title}
              </p>
            ) : null}
            <dl className="divide-border divide-y">
              {section.questions.map((q) => {
                const value = detail.answers[q.id]
                const fileValue =
                  q.type === 'file' && value && typeof value === 'object' && 'path' in value
                    ? (value as { path: string; filename: string })
                    : null
                return (
                  <div key={q.id} className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[1fr_1fr]">
                    <dt className="text-muted-foreground text-sm">{q.label}</dt>
                    <dd className="text-sm">
                      {fileValue ? (
                        <a
                          href={`/formularios/${detail.formId}/respuestas/${detail.id}/archivo?path=${encodeURIComponent(fileValue.path)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          <Paperclip className="size-3.5 shrink-0" />
                          {fileValue.filename}
                        </a>
                      ) : (
                        formatAnswer(q, value)
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ))}
      </div>
    </StudentShell>
  )
}
