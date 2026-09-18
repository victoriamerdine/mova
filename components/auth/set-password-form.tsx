'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { activateInvitation } from '@/app/definir-contrasena/actions'
import { validateNewPassword } from '@/lib/auth/password-rules'
import { createClient } from '@/lib/supabase/client'

type Phase = 'checking' | 'ready' | 'invalid'

/**
 * Destino del link del email de invitación. Supabase redirige acá con la
 * sesión de la invitación en el hash de la URL (`#access_token=…&refresh_token=…`,
 * flujo implícito). El cliente de @supabase/ssr es solo-PKCE y descarta
 * esa URL, así que los tokens se leen acá y se le pasan a `setSession`.
 * Sin tokens ni sesión (link vencido, ya usado, o alguien entró directo)
 * no hay nada que definir y se manda a /login.
 */
export function SetPasswordForm() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const initialHash = useRef<string | null>(null)

  useEffect(() => {
    if (initialHash.current === null) {
      initialHash.current = window.location.hash
      // Los tokens no tienen por qué quedar en la barra ni en el historial.
      if (initialHash.current) window.history.replaceState(null, '', window.location.pathname)
    }
    const params = new URLSearchParams(initialHash.current.replace(/^#/, ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const linkFailed = params.has('error') || params.has('error_code')

    let cancelled = false
    const supabase = createClient()
    const resolve = async () => {
      if (linkFailed) return false
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        return !sessionError
      }
      const { data } = await supabase.auth.getSession()
      return Boolean(data.session)
    }
    resolve().then((ok) => {
      if (!cancelled) setPhase(ok ? 'ready' : 'invalid')
    })
    return () => {
      cancelled = true
    }
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = validateNewPassword(password, confirm)
    if (invalid) return setError(invalid)
    setError(null)

    startTransition(async () => {
      const { error: authError } = await createClient().auth.updateUser({ password })
      if (authError) {
        setError(
          authError.code === 'same_password'
            ? 'Elegí una contraseña distinta a la anterior.'
            : authError.message,
        )
        return
      }
      const res = await activateInvitation()
      if (res.error) return setError(res.error)
      window.location.assign('/alumno')
    })
  }

  if (phase === 'checking') {
    return <p className="text-muted-foreground text-center text-sm">Verificando tu invitación…</p>
  }

  if (phase === 'invalid') {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm font-medium">Este link venció o ya se usó.</p>
        <p className="text-muted-foreground text-xs">
          Pedile a tu profesor que te reenvíe el acceso. Si ya elegiste tu contraseña, entrá desde
          acá.
        </p>
        <Button nativeButton={false} render={<Link href="/login">Ir a iniciar sesión</Link>} />
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error ? (
        <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Contraseña nueva</span>
        <PasswordInput
          name="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Repetila</span>
        <PasswordInput
          name="confirm"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      <Button type="submit" className="mt-1 h-10 w-full" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar y entrar'}
      </Button>
    </form>
  )
}
