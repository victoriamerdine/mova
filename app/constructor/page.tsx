import { AppSidebar } from '@/components/professor/app-sidebar'
import { ConstructorScreen } from '@/components/professor/constructor-screen'

export default function WorkoutBuilderPage() {
  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Planes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <ConstructorScreen />
      </div>
    </div>
  )
}
