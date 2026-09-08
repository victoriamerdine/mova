'use client'

import { useEffect, useState, useTransition } from 'react'
import { Check, Copy, Eye, EyeOff, KeyRound, MessageCircle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generatePassword } from '@/lib/auth/generate-password'
import { resetStudentPassword } from '@/app/alumnos/actions'

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Copiar"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="text-primary" /> : <Copy />}
    </Button>
  )
}

export function StudentAccessCard({
  studentId,
  studentName,
  phone,
  username,
}: {
  studentId: string
  studentName: string
  phone: string | null
  username: string | null
}) {
  const [resetting, setResetting] = useState(false)
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState(() => generatePassword())
  const [show, setShow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const loginUrl = `${origin}/login`
  const wa = (text: string) =>
    phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}` : null

  const resendMsg =
    `Hola ${studentName}! Para entrar a MOVA: ${loginUrl}\n` +
    (username ? `Usuario: ${username}\n` : '') +
    `Si no te acordás la contraseña, avisame y te la reseteo.`

  const doneMsg =
    `Hola ${studentName}! Datos para entrar a MOVA: ${loginUrl}\n` +
    (username ? `Usuario: ${username}\n` : '') +
    `Contraseña: ${done}`

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await resetStudentPassword(studentId, password)
      if (res.error) setError(res.error)
      else setDone(password)
    })
  }

  function closeReset() {
    setResetting(false)
    setDone(null)
    setError(null)
    setPassword(generatePassword())
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {username ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">Usuario:</span>
            <code className="bg-background rounded px-1.5 py-0.5">{username}</code>
            <CopyBtn value={username} />
          </span>
        ) : (
          <span className="text-muted-foreground">Este alumno entra con su email.</span>
        )}
      </div>

      {done ? (
        <div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-lg border p-4">
          <p className="text-sm font-medium">
            Contraseña actualizada — compartila ahora, no se vuelve a mostrar
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {username ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-muted-foreground">Usuario:</span>
                <code className="bg-background rounded px-1.5 py-0.5">{username}</code>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <span className="text-muted-foreground">Contraseña:</span>
              <code className="bg-background rounded px-1.5 py-0.5">{done}</code>
              <CopyBtn value={done} />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {wa(doneMsg) ? (
              <Button
                size="sm"
                nativeButton={false}
                render={<a href={wa(doneMsg)!} target="_blank" rel="noopener noreferrer" />}
              >
                <MessageCircle data-icon="inline-start" />
                Enviar por WhatsApp
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={closeReset}>
              Listo
            </Button>
          </div>
        </div>
      ) : resetting ? (
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
              <Button variant="ghost" size="sm" onClick={closeReset}>
                Cancelar
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            El alumno entra con {username ? 'su usuario' : 'su email'} y esta contraseña. La anterior
            deja de funcionar.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {wa(resendMsg) ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={wa(resendMsg)!} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle data-icon="inline-start" />
              Reenviar acceso
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setResetting(true)}>
            <KeyRound data-icon="inline-start" />
            Restablecer contraseña
          </Button>
        </div>
      )}
    </div>
  )
}
