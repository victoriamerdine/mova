'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordSection } from '@/components/account/password-section'
import { updateMyPassword, updateMyProfile } from '@/app/cuenta/actions'

type Fields = {
  fullName: string
  email: string
  documentId: string
  phone: string
  address: string
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
      {children}
    </label>
  )
}

export function ProfessorAccountForm({ initial }: { initial: Fields }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [f, setF] = useState<Fields>(initial)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }))

  const dirty =
    f.fullName.trim() !== initial.fullName ||
    f.email.trim().toLowerCase() !== initial.email.toLowerCase() ||
    f.documentId.trim() !== initial.documentId ||
    f.phone.trim() !== initial.phone ||
    f.address.trim() !== initial.address

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await updateMyProfile(f)
      if (res.error) setMsg({ kind: 'error', text: res.error })
      else {
        setMsg({ kind: 'ok', text: 'Datos actualizados.' })
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Labeled label="Nombre completo">
          <Input value={f.fullName} onChange={set('fullName')} />
        </Labeled>
        <Labeled label="Email (con el que entrás)">
          <Input type="email" value={f.email} onChange={set('email')} />
        </Labeled>
        <Labeled label="Documento">
          <Input value={f.documentId} onChange={set('documentId')} />
        </Labeled>
        <Labeled label="Teléfono">
          <Input value={f.phone} onChange={set('phone')} />
        </Labeled>
        <Labeled label="Dirección">
          <Input value={f.address} onChange={set('address')} />
        </Labeled>
      </div>
      <Button size="sm" className="w-fit" disabled={pending || !dirty} onClick={save}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>

      <div className="border-border mt-1 border-t pt-4">
        <PasswordSection save={updateMyPassword} />
      </div>
    </div>
  )
}
