import { redirect } from 'next/navigation'
import { UserPlus } from 'lucide-react'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { RemoveStudentButton } from '@/components/professor/remove-student-button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getRenewalBadge } from '@/lib/plan-renewal'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getMyStudentsWithPlans } from '@/lib/supabase/queries/students'
import { inviteStudent } from '@/app/alumnos/actions'

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
          <Card className="gap-0 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">Invitar alumno</CardTitle>
              <CardDescription className="text-xs">
                Le llega un email para que cree su contraseña y acceda a su plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              {error ? (
                <p className="bg-destructive/10 text-destructive mb-3 rounded-lg px-3 py-2 text-sm">
                  {error}
                </p>
              ) : null}
              <form action={inviteStudent} className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-48 flex-1 flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Nombre</span>
                  <Input type="text" name="fullName" required placeholder="Nombre del alumno" />
                </label>
                <label className="flex min-w-48 flex-1 flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Email</span>
                  <Input type="email" name="email" required placeholder="alumno@ejemplo.com" />
                </label>
                <Button type="submit" className="h-8">
                  <UserPlus data-icon="inline-start" />
                  Invitar
                </Button>
              </form>
            </CardContent>
          </Card>

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
