import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3, CalendarDays, ChevronRight, ClipboardList, Dumbbell, UserRound } from 'lucide-react'

import { StudentShell } from '@/components/student/student-shell'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudent, getStudentActivePlans } from '@/lib/supabase/queries/student-plan'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

function HubCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="border-border bg-card hover:bg-muted/50 flex items-center gap-3 rounded-2xl border p-4 transition-colors"
    >
      <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground block text-xs">{subtitle}</span>
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  )
}

/**
 * Home del alumno: punto de entrada único desde donde elige qué ver — plan,
 * estadísticas, calendario (que ya incluye todos sus registros/historial,
 * ver Fase 9) o su información (perfil que cargó el profesor). El plan en
 * sí vive en /alumno/plan.
 */
export default async function AlumnoHomePage() {
  const student = await getCurrentStudent()
  if (!student) {
    // proxy.ts ya cubre "sin sesión". Acá: un profesor que entró por error.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    redirect(user ? '/' : '/login')
  }

  const plans = await getStudentActivePlans(student.id)
  const planSubtitle =
    plans.length === 0
      ? 'Todavía no tenés un plan activo'
      : plans.length === 1
        ? plans[0].name
        : `${plans.length} planes activos`

  return (
    <StudentShell signOut={signOut}>
      <p className="text-primary text-xs font-bold tracking-widest uppercase">Inicio</p>
      <h1 className="text-2xl font-semibold tracking-tight">Hola {student.fullName.split(' ')[0]}</h1>

      <div className="flex flex-col gap-3">
        <HubCard href="/alumno/plan" icon={Dumbbell} title="Mi plan" subtitle={planSubtitle} />
        {student.role === 'individual' ? (
          <HubCard
            href="/planes"
            icon={ClipboardList}
            title="Crear plan"
            subtitle="Armá y administrá tus propios planes"
          />
        ) : null}
        <HubCard
          href="/alumno/progreso"
          icon={BarChart3}
          title="Mis estadísticas"
          subtitle="Carga, volumen y evolución"
        />
        <HubCard
          href="/alumno/calendario"
          icon={CalendarDays}
          title="Mi calendario"
          subtitle="Eventos y todo lo que registraste"
        />
        <HubCard
          href="/alumno/perfil"
          icon={UserRound}
          title="Mi información"
          subtitle={
            student.role === 'individual'
              ? 'Tus datos, tu perfil de entrenamiento y tu contraseña'
              : 'Los datos que tiene tu profesor sobre vos'
          }
        />
      </div>
    </StudentShell>
  )
}
