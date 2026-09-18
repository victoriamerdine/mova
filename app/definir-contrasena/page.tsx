import { MovaLogo } from '@/components/brand/mova-logo'
import { SetPasswordForm } from '@/components/auth/set-password-form'

export const metadata = { title: 'Elegí tu contraseña — MOVA' }

export default function DefinirContrasenaPage() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <MovaLogo withTagline className="text-foreground h-14 w-auto" />
          <h1 className="text-muted-foreground text-sm font-medium tracking-tight">
            Elegí tu contraseña
          </h1>
        </div>
        <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
          <SetPasswordForm />
        </div>
      </div>
    </div>
  )
}
