'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ProgressNotification } from '@/lib/supabase/queries/professor-dashboard'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

/**
 * Campanita: alumnos con novedades (sesión completada nueva desde la
 * última vez que el profesor abrió su ficha — ver GET /api/notifications).
 * Tocar una lleva a "Avance y comentarios" de ese alumno, ya expandido.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<ProgressNotification[]>([])
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((json: { notifications?: ProgressNotification[] }) => {
        if (!cancelled) {
          setNotifications(json.notifications ?? [])
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notificaciones"
        className="relative"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell />
        {notifications.length > 0 ? (
          <span
            aria-hidden="true"
            className="bg-warning absolute top-1.5 right-1.5 size-1.5 rounded-full"
          />
        ) : null}
      </Button>

      {open ? (
        <div className="bg-popover text-popover-foreground ring-foreground/10 absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg shadow-md ring-1">
          <div className="border-border border-b px-3 py-2">
            <p className="text-xs font-medium">Notificaciones</p>
          </div>
          {!loaded ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">Cargando…</p>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">Sin novedades por ahora.</p>
          ) : (
            <ul className="divide-border max-h-80 divide-y overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.studentId}>
                  <Link
                    href={`/alumnos/${n.studentId}?avance=1#avance`}
                    onClick={() => setOpen(false)}
                    className="hover:bg-muted/60 flex flex-col gap-0.5 px-3 py-2.5 text-sm"
                  >
                    <span>
                      <span className="font-medium">{n.studentName}</span>{' '}
                      <span className="text-muted-foreground">tiene novedades</span>
                    </span>
                    <span className="text-muted-foreground text-xs">{timeAgo(n.latestAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
