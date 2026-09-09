'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, ShieldCheck } from 'lucide-react'

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
} from '@/app/admin/actions'
import type { AdminProfessor } from '@/lib/supabase/queries/admin'

const STATUS: Record<AdminProfessor['status'], { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-warning/15 text-warning-foreground border-transparent' },
  active: { label: 'Activo', cls: 'bg-primary/10 text-primary border-transparent' },
  suspended: { label: 'Suspendido', cls: 'bg-destructive/10 text-destructive border-transparent' },
}

export function AdminProfessorsPanel({ professors }: { professors: AdminProfessor[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

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
                    <div className="bg-muted/30 flex flex-col gap-3 px-5 py-4 text-sm">
                      <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        <Field label="Documento" value={p.documentId} />
                        <Field label="Teléfono" value={p.phone} />
                        <Field label="Dirección" value={p.address} />
                        <Field label="Alta" value={new Date(p.createdAt).toLocaleDateString()} />
                      </dl>

                      <div className="flex flex-wrap gap-2">
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

                        <ResetPassword professorId={p.id} onToast={setToast} />

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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  )
}

function ResetPassword({
  professorId,
  onToast,
}: {
  professorId: string
  onToast: (s: string | null) => void
}) {
  const [pending, startTransition] = useTransition()
  const [pw, setPw] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  if (pw) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        Nueva contraseña: <code className="bg-background rounded px-1.5 py-0.5">{pw}</code>
        <button
          type="button"
          className="text-primary"
          onClick={() => navigator.clipboard.writeText(pw)}
        >
          copiar
        </button>
      </span>
    )
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Restablecer contraseña
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        const p = generatePassword()
        startTransition(async () => {
          const res = await resetProfessorPassword(professorId, p)
          if (res.error) onToast(res.error)
          else setPw(p)
        })
      }}
    >
      {pending ? 'Generando…' : 'Confirmar contraseña nueva'}
    </Button>
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
