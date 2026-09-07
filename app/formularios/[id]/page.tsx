import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { FormBuilder } from '@/components/forms/form-builder'
import { getCurrentProfessor, getMyStudents } from '@/lib/supabase/queries/professor-dashboard'
import { getFormForEditor } from '@/lib/supabase/queries/forms'
import { getLibraryCatalog } from '@/lib/supabase/queries/exercises'

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { id } = await params
  const [form, catalog, students] = await Promise.all([
    getFormForEditor(id),
    getLibraryCatalog(),
    getMyStudents(professor.id),
  ])
  if (!form) notFound()

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Formularios" />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-4 px-6 py-6">
          <Link href="/formularios" className="text-muted-foreground text-xs hover:underline">
            ← Formularios
          </Link>
          <FormBuilder
            form={form}
            sports={catalog.sports}
            students={students.map((s) => ({ id: s.id, name: s.fullName }))}
          />
        </main>
      </div>
    </div>
  )
}
