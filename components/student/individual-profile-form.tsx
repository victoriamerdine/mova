'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { PasswordSection } from '@/components/account/password-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { changeMyPassword, updateMyIndividualProfile } from '@/app/alumno/actions'

export type IndividualProfileFields = {
  fullName: string
  email: string
  phone: string
  primarySportId: string
  level: string
  availability: string
  equipmentAccess: string
  notes: string
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
      {children}
    </label>
  )
}

/**
 * "Mi información" del alumno individual: a diferencia del alumno con
 * profesor (solo lectura), acá nadie más carga estos datos, así que los
 * edita él — más el cambio de contraseña.
 */
export function IndividualProfileForm({
  initial,
  sports,
}: {
  initial: IndividualProfileFields
  sports: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [f, setF] = useState<IndividualProfileFields>(initial)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const set =
    (k: keyof IndividualProfileFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((prev) => ({ ...prev, [k]: e.target.value }))

  const dirty = (Object.keys(initial) as (keyof IndividualProfileFields)[]).some(
    (k) => f[k].trim() !== initial[k],
  )

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await updateMyIndividualProfile(f)
      if (res.error) setMsg({ kind: 'error', text: res.error })
      else {
        setMsg({ kind: 'ok', text: 'Datos actualizados.' })
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {msg ? (
        <p
          className={
            'rounded-lg border px-3 py-2 text-xs ' +
            (msg.kind === 'ok'
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-destructive/10 text-destructive border-transparent')
          }
        >
          {msg.text}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Datos personales</h2>
        <Labeled label="Nombre completo">
          <Input value={f.fullName} onChange={set('fullName')} autoComplete="name" />
        </Labeled>
        <Labeled label="Email (con el que entrás)">
          <Input type="email" value={f.email} onChange={set('email')} autoComplete="email" />
        </Labeled>
        <Labeled label="Teléfono">
          <Input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" />
        </Labeled>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Mi perfil de entrenamiento</h2>
        <Labeled label="Deporte principal">
          <select
            value={f.primarySportId}
            onChange={set('primarySportId')}
            className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
          >
            <option value="">—</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Nivel / experiencia">
          <Input value={f.level} onChange={set('level')} placeholder="Ej. Intermedio, 2 años entrenando" />
        </Labeled>
        <Labeled label="Disponibilidad">
          <Input value={f.availability} onChange={set('availability')} placeholder="Ej. Lun, mié y vie a la mañana" />
        </Labeled>
        <Labeled label="Equipamiento">
          <Input value={f.equipmentAccess} onChange={set('equipmentAccess')} placeholder="Ej. Gimnasio completo" />
        </Labeled>
        <Labeled label="Notas">
          <Textarea value={f.notes} onChange={set('notes')} rows={3} placeholder="Lesiones, objetivos, lo que quieras tener presente" />
        </Labeled>
      </section>

      <Button className="w-full" disabled={pending || !dirty} onClick={save}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>

      <div className="border-border border-t pt-4">
        <h2 className="mb-2 text-sm font-semibold">Contraseña</h2>
        <PasswordSection save={changeMyPassword} />
      </div>
    </div>
  )
}
