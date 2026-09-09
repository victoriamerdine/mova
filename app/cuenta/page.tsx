import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/professor/app-sidebar'
import { MobileNav } from '@/components/professor/mobile-nav'
import { DashboardHeader } from '@/components/professor/dashboard-header'
import { ProfessorAccountForm } from '@/components/professor/professor-account-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor, getSessionRole } from '@/lib/supabase/queries/professor-dashboard'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const professor = await getCurrentProfessor()
  if (!professor) {
    const { role, professorStatus } = await getSessionRole()
    if (role === 'admin') redirect('/admin')
    if (role === 'student') redirect('/alumno')
    if (role === 'professor') redirect(professorStatus === 'active' ? '/' : '/pendiente')
    redirect('/login')
  }

  const supabase = await createClient()
  const [{ data: user }, { data: prof }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('professors')
      .select('document_id, phone, address')
      .eq('id', professor.id)
      .maybeSingle(),
  ])

  return (
    <div className="bg-background flex min-h-svh">
      <AppSidebar active="Configuración" />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <DashboardHeader professorName={professor.fullName} />

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Mi cuenta</h1>
            <p className="text-muted-foreground text-sm">
              Tus datos personales y tu acceso. Los cambios se aplican al instante.
            </p>
          </div>

          <Card className="gap-0 py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-sm">Datos personales</CardTitle>
              <CardDescription className="text-xs">
                Nombre, documento, contacto y el email con el que entrás.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <ProfessorAccountForm
                initial={{
                  fullName: professor.fullName,
                  email: user.user?.email ?? '',
                  documentId: prof?.document_id ?? '',
                  phone: prof?.phone ?? '',
                  address: prof?.address ?? '',
                }}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
