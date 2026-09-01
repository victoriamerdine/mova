import Link from 'next/link'
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
import { cn } from '@/lib/utils'

// Fallback estático: se usa hasta que la pantalla que renderiza el sidebar
// pase el conteo real por prop (hoy solo /biblioteca lo hace, vía
// libraryCount — ver app/biblioteca/page.tsx). Evita además importar acá
// el array completo de ejercicios solo para contar su .length, que ya no
// existe como array estático de todos modos (la biblioteca real vive en
// Supabase desde la Fase 2).
const FALLBACK_LIBRARY_COUNT = 1362

export function AppSidebar({
  active = 'Dashboard',
  libraryCount = FALLBACK_LIBRARY_COUNT,
  studentCount,
}: {
  active?: string
  libraryCount?: number
  studentCount?: number
}) {
  const nav = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Alumnos', icon: Users, count: studentCount, href: '/alumnos' },
    { label: 'Biblioteca', icon: LibraryBig, count: libraryCount, href: '/biblioteca' },
    { label: 'Planes', icon: ClipboardList, count: undefined, href: '/constructor' },
    { label: 'Analítica', icon: BarChart3, href: '#' },
    { label: 'Configuración', icon: Settings, href: '#' },
  ]

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r border-sidebar-border lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md">
          <Dumbbell className="size-4.5" />
        </span>
        <span className="text-sidebar-accent-foreground text-base font-semibold tracking-tight">
          MOVA
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
          <Link
            key={item.label}
            href={item.href}
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
            {item.count != null ? (
              <span className="text-sidebar-foreground/55 ml-auto font-mono text-xs tnum">
                {item.count}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
