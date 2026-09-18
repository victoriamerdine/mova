'use client'

import { useState, useTransition } from 'react'
import { Check, Eye, EyeOff, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generatePassword } from '@/lib/auth/generate-password'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password-rules'

/**
 * "Cambiar contraseña" plegable — lo comparten la cuenta del profesor y
 * "Mi información" del alumno individual. Cada uno pasa su propia action
 * (`save`), que valida el rol de quien llama.
 */
export function PasswordSection({
  save,
}: {
  save: (newPassword: string) => Promise<{ error?: string }>
}) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function submit() {
    setMsg(null)
    startTransition(async () => {
      const res = await save(pw)
      if (res.error) setMsg({ kind: 'error', text: res.error })
      else {
        setMsg({ kind: 'ok', text: 'Contraseña actualizada.' })
        setOpen(false)
        setPw('')
        setShow(false)
      }
    })
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {msg ? <p className="text-primary text-xs">{msg.text}</p> : null}
        <Button size="sm" variant="outline" className="w-fit" onClick={() => setOpen(true)}>
          Cambiar contraseña
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-[11px] font-medium">Contraseña nueva</p>
      {msg?.kind === 'error' ? <p className="text-destructive text-xs">{msg.text}</p> : null}
      <div className="flex flex-wrap items-center gap-1">
        <Input
          type={show ? 'text' : 'password'}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-48"
          autoComplete="new-password"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setShow((v) => !v)}
          aria-label="Mostrar contraseña"
        >
          {show ? <EyeOff /> : <Eye />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setPw(generatePassword())
            setShow(true)
          }}
          aria-label="Generar una"
        >
          <RefreshCw />
        </Button>
        <Button size="sm" onClick={submit} disabled={pending || pw.length < MIN_PASSWORD_LENGTH}>
          {pending ? 'Guardando…' : <Check className="size-3.5" />}
          {pending ? '' : 'Guardar'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false)
            setPw('')
            setMsg(null)
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
