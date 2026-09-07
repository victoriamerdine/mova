'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { approveChangeRequest, rejectChangeRequest } from '@/app/biblioteca/actions'
import type { ChangeRequest } from '@/lib/library'

/**
 * Bandeja del dueño: solicitudes de cambio que otro profesor hizo sobre sus
 * ejercicios. Aprobar aplica los valores propuestos (mismo id); rechazar las
 * descarta.
 */
export function ChangeRequestsDialog({
  requests,
  catalogNameById,
  onClose,
  onResolved,
}: {
  requests: ChangeRequest[]
  catalogNameById: Map<string, string>
  onClose: () => void
  onResolved: (msg: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run(key: string, fn: () => Promise<{ error?: string }>, okMsg: string) {
    setBusy(key)
    setError(null)
    startTransition(async () => {
      const res = await fn()
      setBusy(null)
      if (res.error) setError(res.error)
      else onResolved(okMsg)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aprobaciones pendientes"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Aprobaciones pendientes</h2>
            <p className="text-muted-foreground text-xs">
              Cambios que otro profesor propuso sobre tus ejercicios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? <p className="text-destructive mb-2 text-xs">{error}</p> : null}
          {requests.length === 0 ? (
            <p className="text-muted-foreground px-2 py-8 text-center text-sm">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {requests.map((req) => (
                <li key={req.id} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{req.exerciseName}</span>
                    <span className="text-muted-foreground text-xs">pidió {req.requestedByName}</span>
                  </div>
                  <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <Row label="Nombre" value={req.proposed.name} />
                    <Row
                      label="Patrón"
                      value={req.proposed.patternId ? (catalogNameById.get(req.proposed.patternId) ?? '—') : '—'}
                    />
                    <Row
                      label="Músculo"
                      value={req.proposed.muscleId ? (catalogNameById.get(req.proposed.muscleId) ?? '—') : '—'}
                    />
                    <Row label="Dificultad" value={req.proposed.difficulty ?? '—'} />
                    <Row
                      label="Deportes"
                      value={
                        (req.proposed.sportIds ?? [])
                          .map((id) => catalogNameById.get(id))
                          .filter(Boolean)
                          .join(', ') || '—'
                      }
                    />
                    <Row label="Video" value={req.proposed.videoUrl || '—'} />
                    <Row label="Descripción" value={req.proposed.description || '—'} />
                  </dl>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(
                          `ok-${req.id}`,
                          () => approveChangeRequest(req.id),
                          `Cambio aprobado en "${req.exerciseName}".`,
                        )
                      }
                    >
                      <Check data-icon="inline-start" />
                      {busy === `ok-${req.id}` ? 'Aplicando…' : 'Aprobar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(
                          `no-${req.id}`,
                          () => rejectChangeRequest(req.id),
                          'Solicitud rechazada.',
                        )
                      }
                    >
                      {busy === `no-${req.id}` ? 'Rechazando…' : 'Rechazar'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </>
  )
}
