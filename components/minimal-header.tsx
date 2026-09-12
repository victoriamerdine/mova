import { signOut } from '@/app/login/actions'

/**
 * Header mínimo para pantallas sin AppSidebar/DashboardHeader (individuo
 * autocoacheado armando su propio plan) — mismo patrón que el header de
 * `/admin`.
 */
export function MinimalHeader({ title, fullName }: { title: string; fullName: string }) {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <span className="text-primary text-xs font-bold tracking-widest uppercase">MOVA · {title}</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">{fullName}</span>
          <form action={signOut}>
            <button type="submit" className="text-muted-foreground hover:text-foreground text-xs">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
