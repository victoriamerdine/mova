import { redirect } from 'next/navigation'

import { getSessionRole } from '@/lib/supabase/queries/professor-dashboard'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function PendingPage() {
  const { role, professorStatus } = await getSessionRole()

  // Si no aplica (no logueado, o ya aprobado, u otro rol), mandarlo a donde va.
  if (role == null) redirect('/login')
  if (role === 'admin') redirect('/admin')
  if (role === 'student') redirect('/alumno')
  if (role === 'professor' && professorStatus === 'active') redirect('/')

  const suspended = professorStatus === 'suspended'

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold tracking-tight">
          {suspended ? 'Cuenta suspendida' : 'Cuenta pendiente de aprobación'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {suspended
            ? 'Un administrador suspendió tu acceso. Escribinos para reactivarla.'
            : 'Tu cuenta de profesor está esperando que un administrador la apruebe. Te avisamos cuando esté lista.'}
        </p>
        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="text-muted-foreground hover:text-foreground text-sm underline"
          >
            Salir
          </button>
        </form>
      </div>
    </div>
  )
}
