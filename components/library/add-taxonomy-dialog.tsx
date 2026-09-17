'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createMuscle, createPattern } from '@/app/biblioteca/actions'
import type { LibraryCatalog } from '@/lib/supabase/queries/exercises'

type Kind = 'pattern' | 'muscle'

/**
 * Alta de un patrón o músculo nuevo — catálogo compartido entre todos los
 * profesores (sin dueño), con un deporte opcional si es específico de
 * uno. Muestra los ya existentes abajo para no duplicar.
 */
export function AddTaxonomyDialog({
  catalog,
  onClose,
  onSaved,
}: {
  catalog: LibraryCatalog
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [kind, setKind] = useState<Kind>('pattern')
  const [name, setName] = useState('')
  const [sportId, setSportId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const list = kind === 'pattern' ? catalog.patterns : catalog.muscles

  function submit() {
    setError(null)
    startTransition(async () => {
      const fn = kind === 'pattern' ? createPattern : createMuscle
      const res = await fn(name, sportId || null)
      if (res.error) {
        setError(res.error)
        return
      }
      setName('')
      setSportId('')
      onSaved(kind === 'pattern' ? 'Patrón agregado.' : 'Músculo agregado.')
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agregar patrón o músculo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Agregar patrón o músculo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="border-border flex gap-1 rounded-full border p-1">
            {(['pattern', 'muscle'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k)
                  setError(null)
                }}
                className={
                  'flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ' +
                  (kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')
                }
              >
                {k === 'pattern' ? 'Patrón' : 'Músculo'}
              </button>
            ))}
          </div>

          {error ? (
            <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Nombre del {kind === 'pattern' ? 'patrón' : 'músculo'}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'pattern' ? 'Ej. Empuje horizontal' : 'Ej. Aductores'}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Deporte (opcional — específico de un deporte)
            </span>
            <select
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm outline-none dark:bg-input/30"
            >
              <option value="">— (universal, cualquier deporte)</option>
              {catalog.sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            size="sm"
            className="w-fit"
            disabled={pending || !name.trim()}
            onClick={submit}
          >
            {pending ? 'Agregando…' : 'Agregar'}
          </Button>

          <div className="border-border border-t pt-3">
            <p className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wide uppercase">
              Ya existen ({list.length})
            </p>
            <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto text-sm">
              {list.map((item) => (
                <li key={item.id} className="text-muted-foreground flex justify-between gap-2">
                  <span className="text-foreground truncate">{item.name}</span>
                  {item.sportName ? <span className="shrink-0 text-xs">{item.sportName}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
