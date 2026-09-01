import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signup } from '@/app/signup/actions'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
            <Dumbbell className="size-5" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Crear cuenta en MOVA
          </h1>
        </div>

        <form action={signup} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-muted-foreground mb-1 text-xs font-medium">
              ¿Cómo vas a usar MOVA?
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="has-checked:border-primary has-checked:bg-primary/5 has-checked:text-primary flex cursor-pointer flex-col gap-0.5 rounded-lg border border-input px-3 py-2.5 text-sm transition-colors">
                <input type="radio" name="role" value="professor" defaultChecked className="sr-only" />
                <span className="font-medium">Soy profesor</span>
                <span className="text-muted-foreground text-xs">Armo planes para mis alumnos</span>
              </label>
              <label className="has-checked:border-primary has-checked:bg-primary/5 has-checked:text-primary flex cursor-pointer flex-col gap-0.5 rounded-lg border border-input px-3 py-2.5 text-sm transition-colors">
                <input type="radio" name="role" value="individual" className="sr-only" />
                <span className="font-medium">Entreno solo</span>
                <span className="text-muted-foreground text-xs">Armo mi propio plan</span>
              </label>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Nombre completo</span>
            <Input type="text" name="fullName" required autoComplete="name" placeholder="Tu nombre" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Email</span>
            <Input type="email" name="email" required autoComplete="email" placeholder="vos@ejemplo.com" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Contraseña</span>
            <Input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <Button type="submit" className="mt-2 h-10 w-full">
            Crear cuenta
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
