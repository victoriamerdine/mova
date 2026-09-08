'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Copy, FileText, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  createForm,
  createFormFromTemplate,
  deleteForm,
  duplicateForm,
} from '@/app/formularios/actions'
import type { FormListItem, SystemTemplate } from '@/lib/supabase/queries/forms'

const STATUS_LABEL: Record<FormListItem['status'], string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
}

export function FormsList({
  forms,
  templates,
}: {
  forms: FormListItem[]
  templates: SystemTemplate[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function createBlank() {
    setError(null)
    startTransition(async () => {
      const res = await createForm(name.trim() || 'Formulario nuevo')
      if (res.error) setError(res.error)
      else router.push(`/formularios/${res.id}`)
    })
  }

  function useTemplate(id: string) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const res = await createFormFromTemplate(id)
      setBusyId(null)
      if (res.error) setError(res.error)
      else router.push(`/formularios/${res.id}`)
    })
  }

  function duplicate(id: string) {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const res = await duplicateForm(id)
      setBusyId(null)
      if (res.error) setError(res.error)
      else router.push(`/formularios/${res.id}`)
    })
  }

  return (
    <>
      <Card className="gap-0 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm">Formulario en blanco</CardTitle>
          <CardDescription className="text-xs">
            Empezá de cero, o usá una plantilla más abajo.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Nombre</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Evaluación inicial"
                onKeyDown={(e) => e.key === 'Enter' && createBlank()}
              />
            </label>
            <Button className="h-8" onClick={createBlank} disabled={pending}>
              <Plus data-icon="inline-start" />
              {pending && !busyId ? 'Creando…' : 'Crear'}
            </Button>
          </div>
          {error ? <p className="text-destructive mt-2 text-xs">{error}</p> : null}
        </CardContent>
      </Card>

      {templates.length > 0 ? (
        <Card className="gap-0 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">Plantillas</CardTitle>
            <CardDescription className="text-xs">
              Copian todas las preguntas a un formulario nuevo tuyo. Después lo editás libremente.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="border-border flex flex-col gap-2 rounded-xl border p-3.5"
                >
                  <div className="flex items-start gap-2">
                    <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {t.name}
                        {t.own ? (
                          <Badge variant="secondary" className="ml-1.5 align-middle text-[10px]">
                            Tuya
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {t.questionCount} pregunta{t.questionCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  {t.description ? (
                    <p className="text-muted-foreground line-clamp-3 text-xs">{t.description}</p>
                  ) : null}
                  <div className="mt-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit"
                      disabled={pending}
                      onClick={() => useTemplate(t.id)}
                    >
                      {busyId === t.id ? 'Creando…' : 'Usar plantilla'}
                    </Button>
                    {t.own ? (
                      <button
                        type="button"
                        aria-label={`Eliminar plantilla ${t.name}`}
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return
                          startTransition(async () => {
                            const res = await deleteForm(t.id)
                            if (res.error) setError(res.error)
                            else router.refresh()
                          })
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-sm">Mis formularios</CardTitle>
          <CardDescription className="text-xs">
            {forms.length} formulario{forms.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {forms.length === 0 ? (
            <div className="text-muted-foreground px-5 py-12 text-center text-sm">
              Todavía no creaste ningún formulario.
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {forms.map((f) => (
                <li key={f.id} className="group hover:bg-muted/50 flex items-center gap-3 px-5 py-3.5 transition-colors">
                  <Link href={`/formularios/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {f.questionCount} pregunta{f.questionCount === 1 ? '' : 's'} ·{' '}
                        {f.responseCount} envío{f.responseCount === 1 ? '' : 's'}
                        {f.sportNames.length > 0 ? ` · ${f.sportNames.join(', ')}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant={f.status === 'published' ? 'default' : 'secondary'}
                      className={f.status === 'published' ? 'bg-primary/10 text-primary border-transparent' : ''}
                    >
                      {STATUS_LABEL[f.status]}
                    </Badge>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Duplicar ${f.name}`}
                    disabled={pending}
                    onClick={() => duplicate(f.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${f.name}`}
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`¿Eliminar "${f.name}"?`)) return
                      startTransition(async () => {
                        const res = await deleteForm(f.id)
                        if (res.error) setError(res.error)
                        else router.refresh()
                      })
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
