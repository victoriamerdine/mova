'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createForm, createFormFromTemplate, deleteForm } from '@/app/formularios/actions'
import type { FormListItem } from '@/lib/supabase/queries/forms'

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
  templates: { id: string; name: string; description: string | null }[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function create() {
    setError(null)
    startTransition(async () => {
      const res = templateId
        ? await createFormFromTemplate(templateId)
        : await createForm(name || 'Formulario nuevo')
      if (res.error) setError(res.error)
      else router.push(`/formularios/${res.id}`)
    })
  }

  return (
    <>
      <Card className="gap-0 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm">Crear formulario</CardTitle>
          <CardDescription className="text-xs">
            En blanco, o partiendo de una plantilla del sistema.
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
                disabled={!!templateId}
              />
            </label>
            {templates.length > 0 ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Plantilla</span>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
                >
                  <option value="">— En blanco —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Button className="h-8" onClick={create} disabled={pending}>
              <Plus data-icon="inline-start" />
              {pending ? 'Creando…' : 'Crear'}
            </Button>
          </div>
          {error ? <p className="text-destructive mt-2 text-xs">{error}</p> : null}
        </CardContent>
      </Card>

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
