import { redirect } from 'next/navigation'

import { AdminProfessorsPanel } from '@/components/admin/admin-professors-panel'
import { getAdminProfessors, getCurrentAdmin } from '@/lib/supabase/queries/admin'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    redirect(user ? '/' : '/login')
  }

  const professors = await getAdminProfessors()
  const pending = professors.filter((p) => p.status === 'pending').length

  return (
    <div className="bg-background min-h-svh">
      <header className="border-border bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <span className="text-primary text-xs font-bold tracking-widest uppercase">MOVA · Admin</span>
          <form action={signOut}>
            <button type="submit" className="text-muted-foreground hover:text-foreground text-xs">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-6 py-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Profesores</h1>
          <p className="text-muted-foreground text-sm">
            {professors.length} en total
            {pending > 0 ? ` · ${pending} pendiente${pending === 1 ? '' : 's'} de aprobación` : ''}
          </p>
        </div>
        <AdminProfessorsPanel professors={professors} />
      </main>
    </div>
  )
}
