'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Copy,
  GripVertical,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AVAILABLE_QUESTION_TYPES, QUESTION_TYPE_BY_KEY } from '@/lib/forms/question-types'
import type { QuestionConfig, QuestionType } from '@/lib/forms/types'
import type { EditorQuestion, EditorSection, FormForEditor } from '@/lib/supabase/queries/forms'
import {
  addQuestion,
  addRule,
  addSection,
  createSubmission,
  deleteQuestion,
  deleteRule,
  deleteSection,
  duplicateForm,
  publishForm,
  renameForm,
  reorderQuestions,
  reorderSections,
  saveFormAsTemplate,
  setFormSports,
  setFormStatus,
  setQuestionOptions,
  updateQuestion,
  updateRule,
  updateSection,
} from '@/app/formularios/actions'
import type { RuleAction, RuleOperator } from '@/lib/forms/types'

export function FormBuilder({
  form,
  sports,
  students,
}: {
  form: FormForEditor
  sports: { id: string; name: string }[]
  students: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [sendOpen, setSendOpen] = useState(false)

  const [name, setName] = useState(form.name)
  const [description, setDescription] = useState(form.description ?? '')
  const [sportIds, setSportIds] = useState<string[]>(form.sportIds)

  function run(fn: () => Promise<{ error?: string }>, okMsg?: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) setToast(res.error)
      else {
        if (okMsg) setToast(okMsg)
        router.refresh()
      }
      if (okMsg || res.error) window.setTimeout(() => setToast(null), 3500)
    })
  }

  function toggleSport(id: string) {
    const next = sportIds.includes(id) ? sportIds.filter((s) => s !== id) : [...sportIds, id]
    setSportIds(next)
    run(() => setFormSports(form.id, next))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-48 flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() !== form.name && run(() => renameForm(form.id, name, description))}
              className="text-base font-semibold"
              aria-label="Nombre del formulario"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => run(() => renameForm(form.id, name, description))}
              rows={1}
              placeholder="Descripción (opcional)"
              className="mt-1.5 text-sm"
            />
          </div>
          <Badge
            variant={form.status === 'published' ? 'default' : 'secondary'}
            className={form.status === 'published' ? 'bg-primary/10 text-primary border-transparent' : ''}
          >
            {form.status === 'published'
              ? `Publicado v${form.publishedVersion}`
              : form.status === 'archived'
                ? 'Archivado'
                : 'Borrador'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => run(() => publishForm(form.id), 'Formulario publicado.')}
            disabled={pending}
          >
            {form.status === 'published' ? 'Publicar cambios' : 'Publicar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || form.status !== 'published'}
            onClick={() => setSendOpen(true)}
          >
            <Send data-icon="inline-start" />
            Enviar a un alumno
          </Button>
          <Link href={`/formularios/${form.id}/respuestas`}>
            <Button size="sm" variant="outline">
              Respuestas
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await duplicateForm(form.id)
                if (res.error) setToast(res.error)
                else router.push(`/formularios/${res.id}`)
              })
            }
          >
            <Copy data-icon="inline-start" />
            Duplicar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => saveFormAsTemplate(form.id), 'Guardado como plantilla.')}
          >
            Guardar como plantilla
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive ml-auto"
            disabled={pending}
            onClick={() =>
              run(
                () => setFormStatus(form.id, form.status === 'archived' ? 'draft' : 'archived'),
                form.status === 'archived' ? 'Reactivado.' : 'Archivado.',
              )
            }
          >
            {form.status === 'archived' ? 'Reactivar' : 'Archivar'}
          </Button>
        </div>

        {/* Deportes */}
        <div>
          <p className="text-muted-foreground mb-1.5 text-[11px] font-medium">Deportes</p>
          <div className="flex flex-wrap gap-1.5">
            {sports.map((s) => {
              const on = sportIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSport(s.id)}
                  className={
                    on
                      ? 'bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-medium'
                      : 'border-input text-muted-foreground hover:text-foreground rounded-full border px-2.5 py-1 text-xs'
                  }
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {toast ? (
        <div className="bg-primary/10 text-primary border-primary/20 rounded-lg border px-3 py-2 text-xs">
          {toast}
        </div>
      ) : null}

      {/* Secciones */}
      {form.sections.map((section, si) => (
        <SectionEditor
          key={section.id}
          formId={form.id}
          section={section}
          index={si}
          total={form.sections.length}
          pending={pending}
          run={run}
          onReorderSection={(dir) => {
            const ids = form.sections.map((s) => s.id)
            const j = si + dir
            if (j < 0 || j >= ids.length) return
            ;[ids[si], ids[j]] = [ids[j], ids[si]]
            run(() => reorderSections(form.id, ids))
          }}
        />
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={pending}
        onClick={() => run(() => addSection(form.id))}
      >
        <Plus data-icon="inline-start" />
        Sección
      </Button>

      <RulesPanel form={form} pending={pending} run={run} />

      {sendOpen ? (
        <SendDialog
          formId={form.id}
          students={students}
          onClose={() => setSendOpen(false)}
        />
      ) : null}
    </div>
  )
}

type RunFn = (fn: () => Promise<{ error?: string }>, okMsg?: string) => void

function SectionEditor({
  formId,
  section,
  index,
  total,
  pending,
  run,
  onReorderSection,
}: {
  formId: string
  section: EditorSection
  index: number
  total: number
  pending: boolean
  run: RunFn
  onReorderSection: (dir: -1 | 1) => void
}) {
  const [title, setTitle] = useState(section.title ?? '')
  const [addType, setAddType] = useState<QuestionType | ''>('')

  return (
    <div className="border-border rounded-xl border p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Subir sección"
            disabled={index === 0}
            onClick={() => onReorderSection(-1)}
            className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Bajar sección"
            disabled={index === total - 1}
            onClick={() => onReorderSection(1)}
            className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30"
          >
            ▼
          </button>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== (section.title ?? '') && run(() => updateSection(formId, section.id, { title }))}
          placeholder="Título de la sección"
          className="h-8 flex-1 font-medium"
        />
        <label className="text-muted-foreground flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={section.sensitive}
            onChange={(e) => run(() => updateSection(formId, section.id, { sensitive: e.target.checked }))}
          />
          Sensible
        </label>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending || total <= 1}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => run(() => deleteSection(formId, section.id))}
          aria-label="Eliminar sección"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {section.questions.map((q, qi) => (
          <QuestionEditor
            key={q.id}
            formId={formId}
            question={q}
            pending={pending}
            run={run}
            onReorder={(dir) => {
              const ids = section.questions.map((x) => x.id)
              const j = qi + dir
              if (j < 0 || j >= ids.length) return
              ;[ids[qi], ids[j]] = [ids[j], ids[qi]]
              run(() => reorderQuestions(formId, section.id, ids))
            }}
          />
        ))}
        {section.questions.length === 0 ? (
          <p className="text-muted-foreground px-1 py-2 text-xs">Sin preguntas todavía.</p>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <select
          value={addType}
          onChange={(e) => {
            const t = e.target.value as QuestionType
            if (t) run(() => addQuestion(formId, section.id, t))
            setAddType('')
          }}
          className="border-input h-8 rounded-lg border bg-transparent px-2 text-xs outline-none dark:bg-input/30"
        >
          <option value="">+ Pregunta…</option>
          {AVAILABLE_QUESTION_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function QuestionEditor({
  formId,
  question,
  pending,
  run,
  onReorder,
}: {
  formId: string
  question: EditorQuestion
  pending: boolean
  run: RunFn
  onReorder: (dir: -1 | 1) => void
}) {
  const meta = QUESTION_TYPE_BY_KEY[question.type]
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(question.label)
  const [helpText, setHelpText] = useState(question.helpText ?? '')
  const [config, setConfig] = useState<QuestionConfig>(question.config)
  const [options, setOptions] = useState(question.options)

  function saveConfig(next: QuestionConfig) {
    setConfig(next)
    run(() => updateQuestion(formId, question.id, { config: next }))
  }

  return (
    <div className="bg-secondary/30 flex flex-col gap-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button type="button" aria-label="Subir" onClick={() => onReorder(-1)} className="text-muted-foreground/50 hover:text-foreground">▲</button>
          <button type="button" aria-label="Bajar" onClick={() => onReorder(1)} className="text-muted-foreground/50 hover:text-foreground">▼</button>
        </div>
        <GripVertical aria-hidden className="text-muted-foreground/30 size-4 shrink-0" />
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== question.label && run(() => updateQuestion(formId, question.id, { label }))}
          className="h-8 flex-1"
        />
        <Badge variant="outline" className="text-muted-foreground shrink-0">
          {meta.label}
        </Badge>
        <label className="text-muted-foreground flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => run(() => updateQuestion(formId, question.id, { required: e.target.checked }))}
          />
          Obligatoria
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Más opciones"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => run(() => deleteQuestion(formId, question.id))}
          aria-label="Eliminar pregunta"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {open ? (
        <div className="flex flex-col gap-2 pl-8">
          <Input
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            onBlur={() => run(() => updateQuestion(formId, question.id, { helpText }))}
            placeholder="Texto de ayuda (opcional)"
            className="h-8 text-sm"
          />

          {meta.configFields.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {meta.configFields.map((f) => (
                <label key={String(f.key)} className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {f.label}
                  </span>
                  {f.kind === 'bool' ? (
                    <input
                      type="checkbox"
                      checked={Boolean(config[f.key])}
                      onChange={(e) => saveConfig({ ...config, [f.key]: e.target.checked })}
                    />
                  ) : f.kind === 'select' ? (
                    <select
                      value={String(config[f.key] ?? '')}
                      onChange={(e) => saveConfig({ ...config, [f.key]: e.target.value })}
                      className="border-input h-7 rounded-md border bg-transparent px-1.5 text-sm outline-none dark:bg-input/30"
                    >
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={f.kind === 'number' ? 'number' : 'text'}
                      value={String(config[f.key] ?? '')}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          [f.key]: f.kind === 'number' ? Number(e.target.value) || undefined : e.target.value,
                        })
                      }
                      onBlur={() => run(() => updateQuestion(formId, question.id, { config }))}
                      className="h-7 text-sm"
                    />
                  )}
                </label>
              ))}
            </div>
          ) : null}

          {meta.hasOptions ? (
            <OptionsEditor
              formId={formId}
              questionId={question.id}
              options={options}
              setOptions={setOptions}
              run={run}
            />
          ) : null}

          <label className="text-muted-foreground flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={question.sensitive}
              onChange={(e) => run(() => updateQuestion(formId, question.id, { sensitive: e.target.checked }))}
            />
            Información sensible (lesión / restricción)
          </label>
        </div>
      ) : null}
    </div>
  )
}

function OptionsEditor({
  formId,
  questionId,
  options,
  setOptions,
  run,
}: {
  formId: string
  questionId: string
  options: EditorQuestion['options']
  setOptions: (o: EditorQuestion['options']) => void
  run: RunFn
}) {
  function save(next: EditorQuestion['options']) {
    setOptions(next)
    run(() => setQuestionOptions(formId, questionId, next.map((o) => ({ value: o.value, label: o.label }))))
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Opciones</span>
      {options.map((o, i) => (
        <div key={o.id ?? i} className="flex items-center gap-1.5">
          <Input
            value={o.label}
            onChange={(e) => {
              const next = [...options]
              next[i] = { ...o, label: e.target.value, value: e.target.value }
              setOptions(next)
            }}
            onBlur={() => save(options)}
            className="h-7 text-sm"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => save(options.filter((_, j) => j !== i))}
            aria-label="Quitar opción"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground w-fit"
        onClick={() =>
          save([
            ...options,
            { id: `new-${options.length}`, order: options.length, value: '', label: `Opción ${options.length + 1}` },
          ])
        }
      >
        <Plus data-icon="inline-start" />
        Opción
      </Button>
    </div>
  )
}

function SendDialog({
  formId,
  students,
  onClose,
}: {
  formId: string
  students: { id: string; name: string }[]
  onClose: () => void
}) {
  const [mode, setMode] = useState<'student' | 'prospect'>(students.length > 0 ? 'student' : 'prospect')
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function send() {
    setError(null)
    startTransition(async () => {
      const res = await createSubmission({
        formId,
        studentId: mode === 'student' ? studentId : null,
        inviteeName: mode === 'prospect' ? name : undefined,
        inviteeContact: mode === 'prospect' ? contact : undefined,
      })
      if (res.error) setError(res.error)
      else setLink(`${window.location.origin}${res.url}`)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enviar formulario"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl"
      >
        <h2 className="mb-3 text-sm font-semibold">Enviar formulario</h2>

        {link ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">Link generado. Compartilo con el alumno:</p>
            <Input readOnly value={link} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => navigator.clipboard?.writeText(link)}>
                Copiar
              </Button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Te dejo el formulario: ' + link)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline">
                  WhatsApp
                </Button>
              </a>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 text-xs">
              {students.length > 0 ? (
                <label className="flex items-center gap-1">
                  <input type="radio" checked={mode === 'student'} onChange={() => setMode('student')} />
                  Alumno existente
                </label>
              ) : null}
              <label className="flex items-center gap-1">
                <input type="radio" checked={mode === 'prospect'} onChange={() => setMode('prospect')} />
                Prospecto (sin cuenta)
              </label>
            </div>

            {mode === 'student' ? (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Contacto (email / teléfono, opcional)"
                />
              </>
            )}

            {error ? <p className="text-destructive text-xs">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button size="sm" onClick={send} disabled={pending}>
                {pending ? 'Generando…' : 'Generar link'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Reglas — lógica condicional (una condición por regla en la v1)
// ============================================================
const OP_LABEL: Record<RuleOperator, string> = {
  eq: 'es igual a',
  neq: 'no es igual a',
  in: 'es uno de',
  gt: 'es mayor que',
  lt: 'es menor que',
  answered: 'fue respondida',
  not_answered: 'no fue respondida',
}
const ACTION_LABEL: Record<RuleAction, string> = {
  show: 'mostrar',
  hide: 'ocultar',
  require: 'hacer obligatoria',
  skip_to: 'saltar a',
}

function RulesPanel({
  form,
  pending,
  run,
}: {
  form: FormForEditor
  pending: boolean
  run: RunFn
}) {
  const questions = form.sections.flatMap((s) => s.questions.map((q) => ({ id: q.id, label: q.label })))
  const targets = [
    ...form.sections.map((s) => ({ kind: 'section' as const, id: s.id, label: `Sección: ${s.title ?? 'sin título'}` })),
    ...questions.map((q) => ({ kind: 'question' as const, id: q.id, label: q.label })),
  ]

  return (
    <div className="border-border rounded-xl border p-3">
      <p className="mb-2 text-sm font-medium">Reglas</p>
      {form.rules.length === 0 ? (
        <p className="text-muted-foreground mb-2 text-xs">
          Sin reglas. Ej: “Si <em>¿Practicás deporte?</em> es igual a <em>Sí</em> → mostrar la sección de deporte”.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {form.rules.map((rule) => {
          const cond = rule.when[0] ?? { questionId: '', op: 'eq' as RuleOperator, value: '' }
          const needsValue = !['answered', 'not_answered'].includes(cond.op)
          return (
            <li key={rule.id} className="flex flex-wrap items-center gap-1.5 text-xs">
              <span>Si</span>
              <select
                value={cond.questionId}
                onChange={(e) =>
                  run(() => updateRule(form.id, rule.id, { when: [{ ...cond, questionId: e.target.value }] }))
                }
                className="border-input h-7 max-w-40 rounded-md border bg-transparent px-1.5 outline-none dark:bg-input/30"
              >
                <option value="">pregunta…</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
              <select
                value={cond.op}
                onChange={(e) =>
                  run(() => updateRule(form.id, rule.id, { when: [{ ...cond, op: e.target.value as RuleOperator }] }))
                }
                className="border-input h-7 rounded-md border bg-transparent px-1.5 outline-none dark:bg-input/30"
              >
                {(Object.keys(OP_LABEL) as RuleOperator[]).map((op) => (
                  <option key={op} value={op}>
                    {OP_LABEL[op]}
                  </option>
                ))}
              </select>
              {needsValue ? (
                <Input
                  defaultValue={String(cond.value ?? '')}
                  onBlur={(e) =>
                    run(() => updateRule(form.id, rule.id, { when: [{ ...cond, value: e.target.value }] }))
                  }
                  placeholder="valor"
                  className="h-7 w-28 text-xs"
                />
              ) : null}
              <span>→</span>
              <select
                value={rule.action}
                onChange={(e) =>
                  run(() => updateRule(form.id, rule.id, { action: e.target.value as RuleAction }))
                }
                className="border-input h-7 rounded-md border bg-transparent px-1.5 outline-none dark:bg-input/30"
              >
                {(['show', 'hide', 'require'] as RuleAction[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABEL[a]}
                  </option>
                ))}
              </select>
              <select
                value={`${rule.target.kind}:${rule.target.id}`}
                onChange={(e) => {
                  const [kind, id] = e.target.value.split(':')
                  run(() =>
                    updateRule(form.id, rule.id, {
                      target: { kind: kind as 'question' | 'section', id },
                    }),
                  )
                }}
                className="border-input h-7 max-w-40 rounded-md border bg-transparent px-1.5 outline-none dark:bg-input/30"
              >
                <option value="question:">destino…</option>
                {targets.map((t) => (
                  <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => run(() => deleteRule(form.id, rule.id))}
                aria-label="Eliminar regla"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          )
        })}
      </ul>

      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground mt-2"
        disabled={pending || questions.length === 0}
        onClick={() => run(() => addRule(form.id))}
      >
        <Plus data-icon="inline-start" />
        Regla
      </Button>
    </div>
  )
}
