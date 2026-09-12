'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Copy, KeyRound, MessageCircle, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { generatePassword } from '@/lib/auth/generate-password'
import {
  createIndividualPlan,
  resetIndividualPassword,
  setIndividualStatus,
} from '@/app/admin/actions'
import type { AdminIndividual } from '@/lib/supabase/queries/admin'

const STATUS: Record<AdminIndividual['status'], { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-primary/10 text-primary border-transparent' },
  inactive: { label: 'Inactivo', cls: 'bg-muted text-muted-foreground border-transparent' },
}

const PLAN_TYPE_OPTIONS = [
  { value: 'MUSCLE', label: 'Músculo' },
  { value: 'PATTERN', label: 'Patrones' },
  { value: 'MIXED', label: 'Mixto' },
  { value: 'SPORT_SPECIFIC', label: 'Específico de deporte' },
  { value: 'CUSTOM', label: 'Personalizado' },
]

const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground inline-flex items-center"
      aria-label="Copiar"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="text-primary size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function SendMessageButton({
  phone,
  message,
  label,
  variant = 'outline',
}: {
  phone: string | null
  message: string
  label: string
  variant?: 'default' | 'outline'
}) {
  const [copied, setCopied] = useState(false)

  if (phone) {
    return (
      <Button
        size="sm"
        variant={variant}
        nativeButton={false}
        render={<a href={waLink(phone, message)} target="_blank" rel="noopener noreferrer" />}
      >
        <MessageCircle data-icon="inline-start" />
        {label}
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={async () => {
        await navigator.clipboard.writeText(message)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {copied ? 'Copiado' : `${label} (copiar)`}
    </Button>
  )
}

export function AdminIndividualsPanel({ individuals }: { individuals: AdminIndividual[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  function run(fn: () => Promise<{ error?: string }>, ok?: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) setToast(res.error)
      else {
        setToast(ok ?? null)
        router.refresh()
      }
      if (res.error || ok) window.setTimeout(() => setToast(null), 3500)
    })
  }

  return (
    <>
      {toast ? (
        <div className="bg-primary/10 text-primary border-primary/20 rounded-lg border px-3 py-2 text-xs">
          {toast}
        </div>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-sm">Lista</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <ul className="divide-border divide-y">
            {individuals.map((ind) => {
              const open = openId === ind.id
              const loginUrl = `${origin}/login`
              return (
                <li key={ind.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : ind.id)}
                    className="hover:bg-muted/50 flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ind.fullName}</p>
                      <p className="text-muted-foreground text-xs">
                        {ind.email ?? 'sin email'} · {ind.plans.length} plan
                        {ind.plans.length === 1 ? '' : 'es'}
                      </p>
                    </div>
                    <Badge className={STATUS[ind.status].cls}>{STATUS[ind.status].label}</Badge>
                    <ChevronDown
                      className={`text-muted-foreground size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {open ? (
                    <div className="bg-muted/30 flex flex-col gap-4 px-5 py-4 text-sm">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium">Planes</p>
                        {ind.plans.length === 0 ? (
                          <p className="text-muted-foreground text-xs">Todavía no tiene ningún plan.</p>
                        ) : (
                          <ul className="flex flex-col gap-1">
                            {ind.plans.map((p) => (
                              <li key={p.id}>
                                <Link
                                  href={`/planes/${p.id}`}
                                  className="text-primary text-xs hover:underline"
                                >
                                  {p.name} →
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        <CreatePlanForm
                          studentId={ind.id}
                          pending={pending}
                          onCreate={(name, planType) =>
                            startTransition(async () => {
                              const res = await createIndividualPlan(ind.id, name, planType)
                              if (res.error) setToast(res.error)
                              else router.push(`/planes/${res.planId}`)
                            })
                          }
                        />
                      </div>

                      <div className="border-border flex flex-col gap-2 border-t pt-3">
                        <p className="text-xs font-medium">Acceso</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-muted-foreground">Usuario (email):</span>
                          {ind.email ? (
                            <span className="inline-flex items-center gap-1.5">
                              <code className="bg-background rounded px-1.5 py-0.5">{ind.email}</code>
                              <CopyBtn value={ind.email} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        <AccessActions individual={ind} loginUrl={loginUrl} onToast={setToast} />
                      </div>

                      <div className="border-border flex flex-wrap gap-2 border-t pt-3">
                        {ind.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              run(() => setIndividualStatus(ind.id, 'inactive'), 'Cuenta desactivada.')
                            }
                          >
                            Desactivar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(() => setIndividualStatus(ind.id, 'active'), 'Cuenta reactivada.')
                            }
                          >
                            Reactivar
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
            {individuals.length === 0 ? (
              <li className="text-muted-foreground px-5 py-10 text-center text-sm">
                Todavía no hay alumnos independientes.
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}

function CreatePlanForm({
  pending,
  onCreate,
}: {
  studentId: string
  pending: boolean
  onCreate: (name: string, planType: string) => void
}) {
  const [name, setName] = useState('')
  const [planType, setPlanType] = useState('MUSCLE')

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del plan"
        className="h-8 min-w-40 flex-1"
      />
      <select
        value={planType}
        onChange={(e) => setPlanType(e.target.value)}
        className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-xs outline-none dark:bg-input/30"
      >
        {PLAN_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        className="h-8"
        disabled={pending || !name.trim()}
        onClick={() => onCreate(name, planType)}
      >
        <Plus data-icon="inline-start" />
        Crear plan
      </Button>
    </div>
  )
}

function AccessActions({
  individual,
  loginUrl,
  onToast,
}: {
  individual: AdminIndividual
  loginUrl: string
  onToast: (s: string | null) => void
}) {
  const [pending, startTransition] = useTransition()
  const [pw, setPw] = useState<string | null>(null)

  if (pw) {
    const msg =
      `Hola ${individual.fullName}! Datos para entrar a MOVA: ${loginUrl}\n` +
      `Usuario: ${individual.email}\n` +
      `Contraseña: ${pw}`
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          Contraseña nueva:
          <code className="bg-background rounded px-1.5 py-0.5">{pw}</code>
          <CopyBtn value={pw} />
        </span>
        {individual.email ? (
          <SendMessageButton
            phone={individual.phone}
            message={msg}
            label="Enviar usuario y contraseña"
            variant="default"
          />
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setPw(null)}>
          Listo
        </Button>
      </div>
    )
  }

  const accessMsg =
    `Hola ${individual.fullName}! Para entrar a MOVA: ${loginUrl}\n` + `Usuario: ${individual.email}`

  return (
    <div className="flex flex-wrap gap-2">
      {individual.email ? (
        <SendMessageButton phone={individual.phone} message={accessMsg} label="Enviar acceso" />
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          const p = generatePassword()
          startTransition(async () => {
            const res = await resetIndividualPassword(individual.id, p)
            if (res.error) onToast(res.error)
            else setPw(p)
          })
        }}
      >
        <KeyRound data-icon="inline-start" />
        {pending ? 'Generando…' : 'Restablecer contraseña'}
      </Button>
    </div>
  )
}
