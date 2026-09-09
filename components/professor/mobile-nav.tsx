'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LibraryBig,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Alumnos', icon: Users, href: '/alumnos' },
  { label: 'Biblioteca', icon: LibraryBig, href: '/biblioteca' },
  { label: 'Planes', icon: ClipboardList, href: '/planes' },
  { label: 'Formularios', icon: ClipboardCheck, href: '/formularios' },
  { label: 'Analítica', icon: BarChart3, href: '#' },
  { label: 'Configuración', icon: Settings, href: '#' },
] as const

function isActive(pathname: string, href: string) {
  if (href === '#') return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Navegación del profesor en pantallas chicas (el <aside> desktop está
 *  oculto abajo de lg). Barra fija arriba con hamburguesa + drawer. */
export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Cerrar al navegar; bloquear el scroll del body mientras está abierto.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <div className="bg-surface/90 sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="text-muted-foreground hover:text-foreground -ml-1 inline-flex size-9 items-center justify-center rounded-md"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-primary flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
          <Dumbbell className="size-4" />
          MOVA
        </span>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <nav
            aria-label="Menú"
            className="bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col border-r border-sidebar-border p-3"
          >
            <div className="mb-2 flex h-11 items-center justify-between px-2">
              <span className="text-sidebar-accent-foreground flex items-center gap-2 text-base font-semibold tracking-tight">
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 items-center justify-center rounded-md">
                  <Dumbbell className="size-4" />
                </span>
                MOVA
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground inline-flex size-9 items-center justify-center rounded-md"
              >
                <X className="size-5" />
              </button>
            </div>
            {NAV.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  )}
                >
                  <item.icon className="size-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      ) : null}
    </>
  )
}
