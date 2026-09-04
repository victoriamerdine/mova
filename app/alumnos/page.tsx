import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { NewStudentCard } from '@/components/professor/new-student-card'
import { RemoveStudentButton } from '@/components/professor/remove-student-button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRenewalBadge } from '@/lib/plan-renewal'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getMyStudentsWithPlans } from '@/lib/supabase/queries/students'

const PLAN_TYPE_LABEL: Record<string, string> = {
  MUSCLE: 'Músculo',
  PATTERN: 'Patrones',
  MIXED: 'Mixto',
  SPORT_SPECIFIC: 'Específico de deporte',
  CUSTOM: 'Personalizado',
}

function getInitials(fullName: string) {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '—'
  )
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const { error } = await searchParams
  const students = await getMyStudentsWithPlans(professor.id)

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Alumnos" />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader professorName={professor.fullName} />

        <main className="flex flex-1 flex-col gap-6 px-6 py-6">
          <NewStudentCard error={error} />

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="text-sm">Mis alumnos</CardTitle>
              <CardDescription className="text-xs">
                {students.length} alumno{students.length === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0 py-0">
              {students.length === 0 ? (
                <div className="text-muted-foreground px-5 py-12 text-center text-sm">
                  Todavía no invitaste a ningún alumno.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {students.map((student) => {
                    const badge = student.plan
                      ? getRenewalBadge(student.plan.startDate, student.plan.endDate)
                      : null

                    return (
                      <li key={student.studentId} className="flex items-center gap-3 px-5 py-3.5">
                        <Link
                          href={`/alumnos/${student.studentId}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <Avatar className="size-9 rounded-md">
                            <AvatarFallback className="bg-secondary text-secondary-foreground rounded-md text-xs font-semibold">
                              {getInitials(student.fullName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{student.fullName}</p>
                            <p className="text-muted-foreground text-xs">
                              {student.plan ? (
                                <>
                                  {PLAN_TYPE_LABEL[student.plan.planType]} · {student.plan.name}
                                </>
                              ) : (
                                'Sin plan todavía'
                              )}
                            </p>
                          </div>
                        </Link>

                        {student.relationshipStatus === 'invited' ? (
                          <Badge variant="secondary">Invitación pendiente</Badge>
                        ) : null}

                        {badge ? (
                          <Badge
                            className={
                              badge.tone === 'critical'
                                ? 'bg-destructive/10 text-destructive border-transparent'
                                : 'bg-warning/15 text-warning-foreground border-transparent'
                            }
                          >
                            {badge.label}
                          </Badge>
                        ) : null}

                        <RemoveStudentButton studentId={student.studentId} studentName={student.fullName} />
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
