import { AppSidebar } from '@/components/professor/app-sidebar'
import { BuilderHeader } from '@/components/professor/builder-header'
import { ConstructorWorkspace } from '@/components/professor/workout-builder'

export default function WorkoutBuilderPage() {
  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Planes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <BuilderHeader />

        <main className="grid flex-1 items-start gap-6 px-6 py-6 lg:grid-cols-[7fr_3fr]">
          <ConstructorWorkspace />
        </main>
      </div>
    </div>
  )
}
