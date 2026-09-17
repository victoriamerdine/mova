'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'

import { createSport } from '@/app/planes/sport-actions'

const NEW_SPORT_VALUE = '__new__'

/**
 * Select de deporte con la opción "+ Agregar nuevo deporte…" — el
 * profesor lo crea sin salir del formulario (catálogo compartido, sin
 * dueño, mismo criterio que patrones/músculos en la biblioteca).
 * Sigue siendo un `<select name="sportId">` nativo: el `<form>` que lo
 * envuelve no necesita cambios para leer el valor elegido.
 */
export function SportSelect({
  sports: initialSports,
  defaultValue = '',
  className,
}: {
  sports: { id: string; name: string }[]
  defaultValue?: string
  className?: string
}) {
  const [sports, setSports] = useState(initialSports)
  const [value, setValue] = useState(defaultValue)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === NEW_SPORT_VALUE) {
      setAdding(true)
      setError(null)
      return
    }
    setValue(e.target.value)
  }

  function submitNew() {
    setError(null)
    startTransition(async () => {
      const res = await createSport(name)
      if (res.error || !res.id || !res.name) {
        setError(res.error ?? 'No se pudo agregar.')
        return
      }
      const created = { id: res.id, name: res.name }
      setSports((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setValue(created.id)
      setAdding(false)
      setName('')
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        name="sportId"
        value={value}
        onChange={handleChange}
        className={
          className ?? 'border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30'
        }
      >
        <option value="">—</option>
        {sports.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
        <option value={NEW_SPORT_VALUE}>+ Agregar nuevo deporte…</option>
      </select>

      {adding ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Crossfit"
            className="border-input h-7 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-xs outline-none dark:bg-input/30"
          />
          <button
            type="button"
            onClick={submitNew}
            disabled={pending || !name.trim()}
            className="bg-primary text-primary-foreground flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium disabled:opacity-50"
          >
            <Plus className="size-3" />
            {pending ? 'Agregando…' : 'Agregar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setName('')
              setError(null)
            }}
            className="text-muted-foreground h-7 rounded-md px-2 text-xs"
          >
            Cancelar
          </button>
        </div>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
