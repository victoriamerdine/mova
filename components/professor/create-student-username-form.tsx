'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Eye, EyeOff, MessageCircle, RefreshCw, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isValidUsername, normalizeUsername } from '@/lib/auth/student-username'
import { createStudentWithUsername } from '@/app/alumnos/actions'

const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789' // sin 0/o/1/l/i — se confunden al dictar por WhatsApp

function generatePassword(length = 10): string {
  let out = ''
  for (let i = 0; i < length; i++) out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]
  return out
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      aria-label="Copiar"
    >
      {copied ? <Check className="text-primary" /> : <Copy />}
    </Button>
  )
}

export function CreateStudentUsernameForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState(() => generatePassword())
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ fullName: string; username: string; password: string; phone: string } | null>(
    null,
  )

  const normalizedUsername = normalizeUsername(username)
  const usernameError = username.length > 0 && !isValidUsername(normalizedUsername)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createStudentWithUsername(fullName, normalizedUsername, password, phone || null)
      if (result.error) {
        setError(result.error)
      } else {
        setCreated({ fullName: fullName.trim(), username: normalizedUsername, password, phone: phone.trim() })
      }
    })
  }

  function reset() {
    setCreated(null)
    setFullName('')
    setUsername('')
    setPhone('')
    setPassword(generatePassword())
    router.refresh()
  }

  if (created) {
    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
    const message = `Hola ${created.fullName}! Ya podés entrar a MOVA: ${loginUrl}\nUsuario: ${created.username}\nContraseña: ${created.password}`
    const waHref = `https://wa.me/${created.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`

    return (
      <div className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Cuenta creada — compartila ahora, no se vuelve a mostrar</p>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Usuario:</span>
            <code className="bg-background rounded px-1.5 py-0.5">{created.username}</code>
            <CopyButton value={created.username} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Contraseña:</span>
            <code className="bg-background rounded px-1.5 py-0.5">{created.password}</code>
            <CopyButton value={created.password} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" render={<a href={waHref} target="_blank" rel="noopener noreferrer" />}>
            <MessageCircle data-icon="inline-start" />
            Compartir por WhatsApp
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Listo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error ? <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Nombre</span>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Nombre del alumno" />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Usuario</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="ej. juan.perez"
            aria-invalid={usernameError}
          />
        </label>
        <label className="flex min-w-40 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Teléfono (opcional)</span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Para WhatsApp"
            inputMode="tel"
          />
        </label>
      </div>

      {usernameError ? (
        <p className="text-destructive text-xs">
          El usuario debe tener 3-24 caracteres: minúsculas, números, punto, guion o guion bajo.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Contraseña</span>
          <div className="flex items-center gap-1">
            <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPassword((v) => !v)} aria-label="Mostrar contraseña">
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setPassword(generatePassword())} aria-label="Generar otra">
              <RefreshCw />
            </Button>
          </div>
        </label>
        <Button type="submit" className="h-8" disabled={isPending || usernameError}>
          <UserPlus data-icon="inline-start" />
          {isPending ? 'Creando…' : 'Crear alumno'}
        </Button>
      </div>
    </form>
  )
}
