import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { LibraryWorkspace } from '@/components/library/library-workspace'
import {
  getLibraryCatalog,
  getLibraryItems,
  getPendingChangeRequestsForOwner,
} from '@/lib/supabase/queries/exercises'
import { getCurrentLibraryActor } from '@/lib/supabase/queries/professor-dashboard'

export default async function ExerciseLibraryPage() {
  const [exercises, catalog, actor] = await Promise.all([
    getLibraryItems(),
    getLibraryCatalog(),
    getCurrentLibraryActor(),
  ])
  const pendingRequests = actor ? await getPendingChangeRequestsForOwner() : []

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Biblioteca" libraryCount={exercises.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <LibraryWorkspace
          exercises={exercises}
          catalog={catalog}
          canManage={actor != null}
          pendingRequests={pendingRequests}
        />
      </div>
    </div>
  )
}
