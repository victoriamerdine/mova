'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Paperclip } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { applyAnswersToStudent, linkSubmissionToStudent } from '@/app/formularios/actions'
import type { SnapshotQuestion } from '@/lib/forms/types'
import type { SubmissionDetail as Detail } from '@/lib/supabase/queries/forms'

function formatAnswer(q: SnapshotQuestion, value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) {
    return value
      .map((v) => q.options.find((o) => o.value === v)?.label ?? String(v))
      .join(', ')
  }
  if (typeof value === 'object' && value && 'path' in value && 'filename' in value) {
    return String((value as { filename: string }).filename)
  }
  if (typeof value === 'object' && 'value' in value) {
    const o = value as { value: unknown; unit?: string }
    return `${o.value} ${o.unit ?? ''}`.trim()
  }
  if (q.type === 'single_select') {
    return q.options.find((o) => o.value === value)?.label ?? String(value)
  }
  if (q.type === 'birth_date' && typeof value === 'string') {
    const age = Math.floor((Date.now() - new Date(value).getTime()) / 31_557_600_000)
    return Number.isFinite(age) && age > 0 && age < 130 ? `${value} (${age} años)` : String(value)
  }
  return String(value)
}

const HIGHLIGHT_RE =
  /objetivo|deporte|nivel|experienc|disponib|equipo|equipamiento|lesi[oó]n|restricc|horario|frecuenc|edad|nacim/i

export function SubmissionDetail({
  detail,
  sports,
  students,
}: {
  detail: Detail
  sports: { id: string; name: string }[]
  students: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  const allQuestions = useMemo(
    () => detail.structure.sections.flatMap((s) => s.questions),
    [detail.structure],
  )

  const highlights = allQuestions
    .filter((q) => HIGHLIGHT_RE.test(q.label) && detail.answers[q.id] != null)
    .map((q) => ({ label: q.label, value: formatAnswer(q, detail.answers[q.id]) }))

  // "Aplicar al perfil" — pre-carga: valor actual del alumno, con fallback
  // a la mejor coincidencia por palabra clave en las respuestas.
  function guess(re: RegExp): string {
    const q = allQuestions.find((x) => re.test(x.label) && detail.answers[x.id] != null)
    return q ? formatAnswer(q, detail.answers[q.id]) : ''
  }
  const s = detail.student
  const [level, setLevel] = useState(s?.level ?? guess(/nivel|experienc/i))
  const [availability, setAvailability] = useState(s?.availability ?? guess(/disponib|frecuenc|horario/i))
  const [equipment, setEquipment] = useState(s?.equipmentAccess ?? guess(/equipo|equipamiento/i))
  const [notes, setNotes] = useState(s?.notes ?? guess(/lesi[oó]n|restricc/i))
  const [sportId, setSportId] = useState(s?.primarySportId ?? '')

  const [linkId, setLinkId] = useState(students[0]?.id ?? '')

  function show(msg: string) {
    setToast(msg)
    router.refresh()
    window.setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4">
        <div>
          <h1 className="text-lg font-semibold">{detail.respondent}</h1>
          <p className="text-muted-foreground text-sm">
            {detail.formName}
            {detail.contact ? ` · ${detail.contact}` : ''}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {detail.completedAt
              ? `Completado el ${new Date(detail.completedAt).toLocaleString()}`
              : `Enviado el ${new Date(detail.createdAt).toLocaleString()}`}
          </p>
        </div>
        <Badge variant="secondary">{detail.status}</Badge>
      </div>

      {toast ? (
        <div className="bg-primary/10 text-primary border-primary/20 rounded-lg border px-3 py-2 text-xs">
          {toast}
        </div>
      ) : null}

      {highlights.length > 0 ? (
        <Card className="gap-0 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">Resumen</CardTitle>
            <CardDescription className="text-xs">Campos clave detectados.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {highlights.map((h) => (
                <div key={h.label}>
                  <dt className="text-muted-foreground text-[11px]">{h.label}</dt>
                  <dd className="font-medium">{h.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {detail.studentId ? (
        <Card className="gap-0 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">Aplicar al perfil del alumno</CardTitle>
            <CardDescription className="text-xs">
              Revisá y confirmá. Nada se guarda solo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Deporte principal">
                <select
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value)}
                  className="border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm outline-none dark:bg-input/30"
                >
                  <option value="">—</option>
                  {sports.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nivel / experiencia">
                <Input value={level} onChange={(e) => setLevel(e.target.value)} className="h-8" />
              </Field>
              <Field label="Disponibilidad">
                <Input
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="h-8"
                />
              </Field>
              <Field label="Equipamiento">
                <Input
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="h-8"
                />
              </Field>
            </div>
            <Field label="Notas">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Field>
            <Button
              size="sm"
              className="w-fit"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await applyAnswersToStudent(detail.formId, detail.id, detail.studentId!, {
                    level,
                    availability,
                    equipmentAccess: equipment,
                    notes,
                    primarySportId: sportId || null,
                  })
                  if (res.error) setToast(res.error)
                  else show('Perfil actualizado.')
                })
              }
            >
              Guardar en el perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">Prospecto sin cuenta</CardTitle>
            <CardDescription className="text-xs">
              Asociá esta evaluación a un alumno para poder volcar los datos a su perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 px-5">
            <select
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            >
              {students.length === 0 ? <option value="">Sin alumnos</option> : null}
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={pending || !linkId}
              onClick={() =>
                startTransition(async () => {
                  const res = await linkSubmissionToStudent(detail.id, linkId)
                  if (res.error) setToast(res.error)
                  else show('Evaluación asociada al alumno.')
                })
              }
            >
              Asociar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm">Respuestas completas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5">
          {detail.structure.sections.map((section) => (
            <div key={section.id}>
              {section.title ? (
                <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                  {section.title}
                </p>
              ) : null}
              <dl className="divide-border divide-y">
                {section.questions.map((q) => (
                  <div key={q.id} className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[1fr_1fr]">
                    <dt className="text-muted-foreground text-sm">{q.label}</dt>
                    <dd className="text-sm">
                      <AnswerValue detail={detail} q={q} value={detail.answers[q.id]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function AnswerValue({
  detail,
  q,
  value,
}: {
  detail: Detail
  q: SnapshotQuestion
  value: unknown
}) {
  if (q.type === 'file' && value && typeof value === 'object' && 'path' in value) {
    const f = value as { path: string; filename: string; size: number }
    const href = `/formularios/${detail.formId}/respuestas/${detail.id}/archivo?path=${encodeURIComponent(
      f.path,
    )}`
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary inline-flex items-center gap-1 hover:underline"
      >
        <Paperclip className="size-3.5 shrink-0" />
        {f.filename}
      </a>
    )
  }
  return <>{formatAnswer(q, value)}</>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
      {children}
    </label>
  )
}
