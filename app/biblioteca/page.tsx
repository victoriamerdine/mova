import { AppSidebar } from '@/components/professor/app-sidebar'
import { LibraryWorkspace } from '@/components/library/library-workspace'

export default function ExerciseLibraryPage() {
  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Biblioteca" />

      <div className="flex min-w-0 flex-1 flex-col">
        <LibraryWorkspace />
      </div>
    </div>
  )
}
