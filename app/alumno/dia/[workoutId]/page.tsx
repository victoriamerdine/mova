import { notFound, redirect } from 'next/navigation'

import { StudentShell } from '@/components/student/student-shell'
import { StudentDayScreen } from '@/components/student/student-day-screen'
import { getCurrentStudent, getStudentDay } from '@/lib/supabase/queries/student-plan'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function StudentDayPage({
  params,
}: {
  params: Promise<{ workoutId: string }>
}) {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const { workoutId } = await params
  const day = await getStudentDay(student.id, workoutId)
  if (!day) notFound()

  return (
    <StudentShell name={student.fullName} signOut={signOut}>
      <StudentDayScreen day={day} />
    </StudentShell>
  )
}
