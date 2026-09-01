import { Bell, LogOut, Search } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import { signOut } from '@/app/login/actions'

const rawToday = new Date().toLocaleDateString('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1)

function getInitials(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return initials || '—'
}

export function DashboardHeader({ professorName }: { professorName: string }) {
  const firstName = professorName.trim().split(/\s+/)[0] || professorName

  return (
    <header className="bg-surface/85 sticky top-0 z-30 border-b border-border backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">Hola, {firstName}</h1>
          <p className="text-muted-foreground truncate text-xs">{today}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <InputGroup className="hidden w-72 md:flex xl:w-88">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar alumno, plan o ejercicio…"
              aria-label="Buscador global"
            />
          </InputGroup>

          <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
            <Bell />
            <span
              aria-hidden="true"
              className="bg-warning absolute top-1.5 right-1.5 size-1.5 rounded-full"
            />
          </Button>

          <Separator orientation="vertical" className="hidden h-8 sm:block" />

          <div className="flex items-center gap-2">
            <Avatar className="size-9 rounded-md">
              <AvatarFallback className="bg-secondary text-secondary-foreground rounded-md text-xs font-semibold">
                {getInitials(professorName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden leading-tight sm:block">
              <span className="block max-w-32 truncate text-sm font-medium">{professorName}</span>
              <span className="text-muted-foreground block text-xs">Profesor/a</span>
            </span>

            <form action={signOut}>
              <Button variant="ghost" size="icon" aria-label="Cerrar sesión" type="submit">
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
