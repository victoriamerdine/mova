import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { SubmissionDetail } from '@/components/forms/submission-detail'
import { getCurrentProfessor, getMyStudents } from '@/lib/supabase/queries/professor-dashboard'
import { getSubmissionDetail } from '@/lib/supabase/queries/forms'
import { getLibraryCatalog } from '@/lib/supabase/queries/exercises'

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { id, submissionId } = await params
  const [detail, catalog, students] = await Promise.all([
    getSubmissionDetail(submissionId),
    getLibraryCatalog(),
    getMyStudents(professor.id),
  ])
  if (!detail) notFound()

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Formularios" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={professor.fullName} />
        <main className="flex flex-1 flex-col gap-4 px-6 py-6">
          <Link
            href={`/formularios/${id}/respuestas`}
            className="text-muted-foreground text-xs hover:underline"
          >
            ← Respuestas
          </Link>
          <SubmissionDetail
            detail={detail}
            sports={catalog.sports}
            students={students.map((s) => ({ id: s.id, name: s.fullName }))}
          />
        </main>
      </div>
    </div>
  )
}
