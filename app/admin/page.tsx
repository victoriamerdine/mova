import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AdminProfessorsPanel } from '@/components/admin/admin-professors-panel'
import { AdminIndividualsPanel } from '@/components/admin/admin-individuals-panel'
import { getAdminProfessors, getCurrentAdmin, getIndependentStudents } from '@/lib/supabase/queries/admin'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/login/actions'

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'profesores', label: 'Profesores' },
  { key: 'individuales', label: 'Alumnos independientes' },
] as const

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    redirect(user ? '/' : '/login')
  }

  const { tab: tabParam } = await searchParams
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : 'profesores'

  const [professors, individuals] = await Promise.all([getAdminProfessors(), getIndependentStudents()])
  const pending = professors.filter((p) => p.status === 'pending').length

  return (
    <div className="bg-background min-h-svh">
      <header className="border-border bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <span className="text-primary text-xs font-bold tracking-widest uppercase">MOVA · Admin</span>
          <div className="flex items-center gap-4">
            <Link href="/biblioteca" className="text-muted-foreground hover:text-foreground text-xs">
              Biblioteca
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-muted-foreground hover:text-foreground text-xs">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-6 py-6">
        <nav className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin?tab=${t.key}`}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.key === 'profesores' && pending > 0 ? ` (${pending})` : ''}
            </Link>
          ))}
        </nav>

        {tab === 'individuales' ? (
          <>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Alumnos independientes</h1>
              <p className="text-muted-foreground text-sm">
                {individuals.length} en total — entrenan solos, arman su propio plan.
              </p>
            </div>
            <AdminIndividualsPanel individuals={individuals} />
          </>
        ) : (
          <>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Profesores</h1>
              <p className="text-muted-foreground text-sm">
                {professors.length} en total
                {pending > 0 ? ` · ${pending} pendiente${pending === 1 ? '' : 's'} de aprobación` : ''}
              </p>
            </div>
            <AdminProfessorsPanel professors={professors} />
          </>
        )}
      </main>
    </div>
  )
}
