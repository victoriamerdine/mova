import { AppSidebar } from '@/components/professor/app-sidebar'
import { LibraryWorkspace } from '@/components/library/library-workspace'
import { getLibraryCatalog, getLibraryItems } from '@/lib/supabase/queries/exercises'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'

export default async function ExerciseLibraryPage() {
  const [exercises, catalog, professor] = await Promise.all([
    getLibraryItems(),
    getLibraryCatalog(),
    getCurrentProfessor(),
  ])

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Biblioteca" libraryCount={exercises.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <LibraryWorkspace exercises={exercises} catalog={catalog} canManage={professor != null} />
      </div>
    </div>
  )
}
