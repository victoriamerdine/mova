'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { duplicatePlanToStudent } from '@/app/planes/[planId]/actions'

export type OtherStudent = { id: string; fullName: string }

/**
 * Duplica el plan actual hacia OTRO alumno — plantilla reutilizada, sin
 * comentarios/registros del alumno original (esos quedan atados al
 * workout_id viejo, que la copia no toca). Redirige al editor del plan
 * nuevo al terminar.
 */
export function DuplicateToStudentDialog({
  planId,
  planName,
  students,
}: {
  planId: string
  planName: string
  students: OtherStudent[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [targetStudentId, setTargetStudentId] = useState(students[0]?.id ?? '')
  const [name, setName] = useState(`${planName} (copia)`)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await duplicatePlanToStudent(planId, targetStudentId, name)
      if (res.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      router.push(`/planes/${res.planId}`)
    })
  }

  if (students.length === 0) return null

  return (
    <>
      <Button type="button" variant="outline" className="h-8" onClick={() => setOpen(true)}>
        <Copy data-icon="inline-start" />
        Duplicar a otro alumno
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Duplicar plan a otro alumno"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card flex w-full max-w-md flex-col gap-4 rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Duplicar plan a otro alumno</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                disabled={pending}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-muted-foreground text-xs">
              Copia toda la estructura del plan (semanas, días, bloques y ejercicios) para el
              alumno que elijas. No copia el avance ni los comentarios de "{planName}" — el nuevo
              queda sin ninguna sesión registrada.
            </p>

            {error ? <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p> : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Asignar a</span>
              <select
                value={targetStudentId}
                onChange={(e) => setTargetStudentId(e.target.value)}
                className="border-input h-9 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Nombre del plan nuevo</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" onClick={submit} disabled={pending || !targetStudentId}>
                {pending ? 'Duplicando…' : 'Duplicar plan'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
