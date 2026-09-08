import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { SubmissionsList } from '@/components/forms/submissions-list'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getFormMeta, getFormSubmissions } from '@/lib/supabase/queries/forms'

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { id } = await params
  const [form, submissions] = await Promise.all([getFormMeta(id), getFormSubmissions(id)])
  if (!form) notFound()

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Formularios" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader professorName={professor.fullName} />
        <main className="flex flex-1 flex-col gap-4 px-6 py-6">
          <div>
            <Link
              href={`/formularios/${id}`}
              className="text-muted-foreground text-xs hover:underline"
            >
              ← {form.name}
            </Link>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">Respuestas</h1>
          </div>
          <SubmissionsList formId={id} submissions={submissions} />
        </main>
      </div>
    </div>
  )
}
