import { WorkoutExecutionScreen } from '@/components/student/workout-execution-screen'

export default function AlumnoPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
      <div className="relative h-[min(860px,92svh)] w-full max-w-md overflow-hidden rounded-[3rem] border-[10px] border-zinc-950 bg-zinc-950 shadow-2xl">
        <div className="absolute top-0 left-1/2 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-zinc-950" />
        <div className="h-full w-full overflow-hidden rounded-[2.25rem] bg-background">
          <WorkoutExecutionScreen />
        </div>
      </div>
    </div>
  )
}
