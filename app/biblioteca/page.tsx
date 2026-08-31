import { AppSidebar } from '@/components/professor/app-sidebar'
import { LibraryWorkspace } from '@/components/library/library-workspace'
import { getLibraryExercises } from '@/lib/supabase/queries/exercises'

export default async function ExerciseLibraryPage() {
  const exercises = await getLibraryExercises()

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Biblioteca" libraryCount={exercises.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <LibraryWorkspace exercises={exercises} />
      </div>
    </div>
  )
}
