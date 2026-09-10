'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Copy, KeyRound, MessageCircle, Plus, ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { generatePassword } from '@/lib/auth/generate-password'
import {
  createProfessorAccount,
  promoteToAdmin,
  resetProfessorPassword,
  setProfessorStatus,
  updateProfessor,
} from '@/app/admin/actions'
import type { AdminProfessor } from '@/lib/supabase/queries/admin'

const STATUS: Record<AdminProfessor['status'], { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-warning/15 text-warning-foreground border-transparent' },
  active: { label: 'Activo', cls: 'bg-primary/10 text-primary border-transparent' },
  suspended: { label: 'Suspendido', cls: 'bg-destructive/10 text-destructive border-transparent' },
}

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

export function AdminProfessorsPanel({ professors }: { professors: AdminProfessor[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
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

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setCreating((v) => !v)}>
          <Plus data-icon="inline-start" />
          {creating ? 'Cerrar' : 'Crear profesor'}
        </Button>
      </div>
      {creating ? <CreateForm onDone={() => { setCreating(false); router.refresh() }} /> : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-sm">Lista</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <ul className="divide-border divide-y">
            {professors.map((p) => {
              const open = openId === p.id
              const loginUrl = `${origin}/login`
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : p.id)}
                    className="hover:bg-muted/50 flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.fullName}</p>
                      <p className="text-muted-foreground text-xs">
                        {p.email ?? 'sin email'} · {p.studentCount} alumno
                        {p.studentCount === 1 ? '' : 's'} · {p.planCount} plan
                        {p.planCount === 1 ? '' : 'es'}
                      </p>
                    </div>
                    <Badge className={STATUS[p.status].cls}>{STATUS[p.status].label}</Badge>
                    <ChevronDown
                      className={`text-muted-foreground size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {open ? (
                    <div className="bg-muted/30 flex flex-col gap-4 px-5 py-4 text-sm">
                      <ProfessorEditForm
                        professor={p}
                        pending={pending}
                        onSave={(f) => run(() => updateProfessor(p.id, f), 'Datos actualizados.')}
                      />

                      <div className="border-border flex flex-col gap-2 border-t pt-3">
                        <p className="text-xs font-medium">Acceso</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-muted-foreground">Usuario (email):</span>
                          {p.email ? (
                            <span className="inline-flex items-center gap-1.5">
                              <code className="bg-background rounded px-1.5 py-0.5">{p.email}</code>
                              <CopyBtn value={p.email} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        <AccessActions professor={p} loginUrl={loginUrl} onToast={setToast} />
                        <p className="text-muted-foreground text-xs">
                          "Enviar acceso" manda el link y el usuario por WhatsApp, sin cambiar la
                          contraseña. "Restablecer contraseña" genera una nueva y el mensaje va con
                          usuario y contraseña juntos.
                        </p>
                      </div>

                      <div className="border-border flex flex-wrap gap-2 border-t pt-3">
                        {p.status === 'pending' ? (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => run(() => setProfessorStatus(p.id, 'active'), 'Profesor aprobado.')}
                          >
                            Aprobar
                          </Button>
                        ) : null}
                        {p.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              run(() => setProfessorStatus(p.id, 'suspended'), 'Profesor suspendido.')
                            }
                          >
                            Suspender
                          </Button>
                        ) : null}
                        {p.status === 'suspended' ? (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(() => setProfessorStatus(p.id, 'active'), 'Profesor reactivado.')
                            }
                          >
                            Reactivar
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`¿Convertir a ${p.fullName} en administrador?`)) return
                            run(() => promoteToAdmin(p.id), 'Ahora es administrador.')
                          }}
                        >
                          <ShieldCheck data-icon="inline-start" />
                          Hacer admin
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
            {professors.length === 0 ? (
              <li className="text-muted-foreground px-5 py-10 text-center text-sm">
                Todavía no hay profesores.
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}

type EditFields = {
  fullName: string
  email: string
  documentId: string
  phone: string
  address: string
}

function ProfessorEditForm({
  professor,
  pending,
  onSave,
}: {
  professor: AdminProfessor
  pending: boolean
  onSave: (f: EditFields) => void
}) {
  const [f, setF] = useState<EditFields>({
    fullName: professor.fullName,
    email: professor.email ?? '',
    documentId: professor.documentId ?? '',
    phone: professor.phone ?? '',
    address: professor.address ?? '',
  })
  const set = (k: keyof EditFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }))

  const dirty =
    f.fullName.trim() !== professor.fullName ||
    f.email.trim().toLowerCase() !== (professor.email ?? '').toLowerCase() ||
    f.documentId.trim() !== (professor.documentId ?? '') ||
    f.phone.trim() !== (professor.phone ?? '') ||
    f.address.trim() !== (professor.address ?? '')

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium">Datos del profesor</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Labeled label="Nombre completo">
          <Input value={f.fullName} onChange={set('fullName')} />
        </Labeled>
        <Labeled label="Email (usuario)">
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
      <Button
        size="sm"
        className="w-fit"
        disabled={pending || !dirty}
        onClick={() => onSave(f)}
      >
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </div>
  )
}

function AccessActions({
  professor,
  loginUrl,
  onToast,
}: {
  professor: AdminProfessor
  loginUrl: string
  onToast: (s: string | null) => void
}) {
  const [pending, startTransition] = useTransition()
  const [pw, setPw] = useState<string | null>(null)
  const canWa = Boolean(professor.phone && professor.email)

  // Tras restablecer: solo el mensaje con usuario + contraseña juntos.
  if (pw) {
    const msg =
      `Hola ${professor.fullName}! Datos para entrar a MOVA: ${loginUrl}\n` +
      `Usuario: ${professor.email}\n` +
      `Contraseña: ${pw}`
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          Contraseña nueva:
          <code className="bg-background rounded px-1.5 py-0.5">{pw}</code>
          <CopyBtn value={pw} />
        </span>
        {canWa ? (
          <Button
            size="sm"
            nativeButton={false}
            render={
              <a href={waLink(professor.phone!, msg)} target="_blank" rel="noopener noreferrer" />
            }
          >
            <MessageCircle data-icon="inline-start" />
            Enviar usuario y contraseña por WhatsApp
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setPw(null)}>
          Listo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canWa ? (
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <a
              href={waLink(
                professor.phone!,
                `Hola ${professor.fullName}! Para entrar a MOVA: ${loginUrl}\n` +
                  `Usuario: ${professor.email}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <MessageCircle data-icon="inline-start" />
          Enviar acceso
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          const p = generatePassword()
          startTransition(async () => {
            const res = await resetProfessorPassword(professor.id, p)
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

function CreateForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({
    fullName: '',
    email: '',
    documentId: '',
    phone: '',
    address: '',
    password: generatePassword(12),
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }))

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-sm">Nuevo profesor (queda activo)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5">
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Labeled label="Nombre completo">
            <Input value={f.fullName} onChange={set('fullName')} />
          </Labeled>
          <Labeled label="Email">
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
          <Labeled label="Contraseña">
            <Input value={f.password} onChange={set('password')} />
          </Labeled>
        </div>
        <Button
          size="sm"
          className="w-fit"
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const res = await createProfessorAccount(f)
              if (res.error) setError(res.error)
              else onDone()
            })
          }}
        >
          {pending ? 'Creando…' : 'Crear'}
        </Button>
      </CardContent>
    </Card>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
      {children}
    </label>
  )
}
