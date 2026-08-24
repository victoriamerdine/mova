import { Bell, Search } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'

const rawToday = new Date().toLocaleDateString('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1)

export function DashboardHeader() {
  return (
    <header className="bg-surface/85 sticky top-0 z-30 border-b border-border backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">
            Hola, Victoria
          </h1>
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

          <button
            type="button"
            className="flex items-center gap-2.5 rounded-md pl-0.5 text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Avatar className="size-9 rounded-md">
              <AvatarFallback className="bg-secondary text-secondary-foreground rounded-md text-xs font-semibold">
                VL
              </AvatarFallback>
            </Avatar>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium">Victoria Lastra</span>
              <span className="text-muted-foreground block text-xs">Profesora</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
