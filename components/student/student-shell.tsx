import type { ReactNode } from 'react'
import { Dumbbell, LogOut } from 'lucide-react'

/**
 * Marco de la app del alumno: mobile-first, ancho acotado. En desktop se
 * muestra centrado (sin el "teléfono" de juguete anterior — molestaba más
 * de lo que ayudaba).
 */
export function StudentShell({
  signOut,
  children,
}: {
  signOut: () => void
  children: ReactNode
}) {
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="text-primary flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
            <Dumbbell className="size-4" />
            MOVA
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
              aria-label="Salir"
            >
              <LogOut className="size-3.5" />
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">{children}</main>
    </div>
  )
}
