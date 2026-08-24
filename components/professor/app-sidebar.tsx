import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { EXERCISES } from '@/lib/data/library'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Alumnos', icon: Users, count: 24 },
  { label: 'Biblioteca', icon: LibraryBig, count: EXERCISES.length },
  { label: 'Planes', icon: ClipboardList, count: 21 },
  { label: 'Analítica', icon: BarChart3 },
  { label: 'Configuración', icon: Settings },
]

export function AppSidebar({ active = 'Dashboard' }: { active?: string }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r border-sidebar-border lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md">
          <Dumbbell className="size-4.5" />
        </span>
        <span className="text-sidebar-accent-foreground text-base font-semibold tracking-tight">
          Nucleo
        </span>
        <Badge
          variant="outline"
          className="ml-auto border-sidebar-border text-sidebar-foreground/80 text-[10px] font-medium uppercase"
        >
          Coach
        </Badge>
      </div>

      <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-sidebar-foreground/50 px-2 pt-2 pb-1 text-[11px] font-medium tracking-widest uppercase">
          Gestión
        </p>
        {nav.map((item) => (
          <a
            key={item.label}
            href="#"
            aria-current={item.label === active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              item.label === active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            )}
          >
            {item.label === active ? (
              <span
                aria-hidden="true"
                className="bg-sidebar-primary absolute top-1.5 bottom-1.5 -left-3 w-0.5 rounded-r-full"
              />
            ) : null}
            <item.icon className="size-4.5 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.count ? (
              <span className="text-sidebar-foreground/55 ml-auto font-mono text-xs tnum">
                {item.count}
              </span>
            ) : null}
          </a>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/60 p-3">
          <p className="text-sidebar-accent-foreground text-xs font-medium">
            Volumen semanal
          </p>
          <p className="text-sidebar-accent-foreground mt-1 font-mono text-2xl leading-none tnum">
            412
            <span className="text-sidebar-foreground/60 ml-1 text-xs font-sans">series</span>
          </p>
          <p className="text-sidebar-foreground/60 mt-1.5 text-[11px] leading-relaxed">
            Acumulado del staff en la semana en curso
          </p>
        </div>
      </div>
    </aside>
  )
}
