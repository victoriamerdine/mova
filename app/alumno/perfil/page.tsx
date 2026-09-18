import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { IndividualProfileForm } from '@/components/student/individual-profile-form'
import { StudentShell } from '@/components/student/student-shell'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStudent, getMyProfile } from '@/lib/supabase/queries/student-plan'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-border border-b py-3 last:border-0">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  )
}

/**
 * "Mi información". Alumno con profesor: el perfil que el profesor cargó
 * (o aplicó desde un formulario), de solo lectura — mismos campos que
 * "Aplicar al perfil del alumno". Alumno individual: no tiene profesor
 * que lo cargue, así que edita sus datos, su perfil y su contraseña.
 */
export default async function StudentProfilePage() {
  const student = await getCurrentStudent()
  if (!student) redirect('/login')

  const profile = await getMyProfile(student.id)

  if (student.role === 'individual') {
    const supabase = await createClient()
    const [{ data: sports }, { data: auth }] = await Promise.all([
      supabase.from('sports').select('id, name').eq('status', 'active').order('name'),
      supabase.auth.getUser(),
    ])

    return (
      <StudentShell signOut={signOut}>
        <Link
          href="/alumno"
          className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Mi información</h1>
        <p className="text-muted-foreground text-xs">
          Tus datos y tu perfil de entrenamiento — los usamos para armar y sugerirte planes.
        </p>
        <IndividualProfileForm
          sports={sports ?? []}
          initial={{
            fullName: student.fullName,
            email: auth.user?.email ?? '',
            phone: profile?.phone ?? '',
            primarySportId: profile?.primarySportId ?? '',
            level: profile?.level ?? '',
            availability: profile?.availability ?? '',
            equipmentAccess: profile?.equipmentAccess ?? '',
            notes: profile?.notes ?? '',
          }}
        />
      </StudentShell>
    )
  }

  return (
    <StudentShell signOut={signOut}>
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Mi información</h1>
      <p className="text-muted-foreground text-xs">
        Los datos que tiene cargados tu profesor sobre vos.
      </p>

      <div className="border-border rounded-2xl border px-4">
        <Field label="Deporte principal" value={profile?.primarySportName ?? null} />
        <Field label="Nivel / experiencia" value={profile?.level ?? null} />
        <Field label="Disponibilidad" value={profile?.availability ?? null} />
        <Field label="Equipamiento" value={profile?.equipmentAccess ?? null} />
        <Field label="Notas" value={profile?.notes ?? null} />
      </div>
    </StudentShell>
  )
}
