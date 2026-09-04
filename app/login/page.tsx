import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login } from '@/app/login/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
            <Dumbbell className="size-5" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Entrar a MOVA
          </h1>
        </div>

        <form action={login} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="bg-primary/10 text-primary rounded-lg px-3 py-2 text-sm">{message}</p>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Usuario o email</span>
            <Input type="text" name="identifier" required autoComplete="username" placeholder="vos@ejemplo.com" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Contraseña</span>
            <Input type="password" name="password" required autoComplete="current-password" />
          </label>

          <Button type="submit" className="mt-2 h-10 w-full">
            Entrar
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          ¿Todavía no tenés cuenta?{' '}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Creá una
          </Link>
        </p>
      </div>
    </div>
  )
}
