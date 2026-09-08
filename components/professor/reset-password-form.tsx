'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, Eye, EyeOff, KeyRound, MessageCircle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generatePassword } from '@/lib/auth/generate-password'
import { resetStudentPassword } from '@/app/alumnos/actions'

export function ResetPasswordForm({
  studentId,
  studentName,
  phone,
}: {
  studentId: string
  studentName: string
  phone: string | null
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState(() => generatePassword())
  const [show, setShow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await resetStudentPassword(studentId, password)
      if (res.error) setError(res.error)
      else setDone(password)
    })
  }

  function restart() {
    setDone(null)
    setError(null)
    setPassword(generatePassword())
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRound data-icon="inline-start" />
        Restablecer contraseña
      </Button>
    )
  }

  if (done) {
    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
    const message = `Hola ${studentName}! Restablecí tu contraseña de MOVA (${loginUrl}).\nContraseña nueva: ${done}`
    const waHref = phone
      ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
      : null

    return (
      <div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-sm font-medium">
          Contraseña actualizada — compartila ahora, no se vuelve a mostrar
        </p>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Nueva contraseña:</span>
          <code className="bg-background rounded px-1.5 py-0.5">{done}</code>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Copiar"
            onClick={async () => {
              await navigator.clipboard.writeText(done)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? <Check className="text-primary" /> : <Copy />}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {waHref ? (
            <Button
              size="sm"
              nativeButton={false}
              render={<a href={waHref} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle data-icon="inline-start" />
              Compartir por WhatsApp
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={restart}>
            Listo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Nueva contraseña para {studentName}</p>
      {error ? (
        <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Contraseña</span>
          <div className="flex items-center gap-1">
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              onClick={() => setPassword(generatePassword())}
              aria-label="Generar otra"
            >
              <RefreshCw />
            </Button>
          </div>
        </label>
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} disabled={pending || password.length < 8}>
            {pending ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        El alumno entra con su usuario o email y esta contraseña. La anterior deja de funcionar.
      </p>
    </div>
  )
}
