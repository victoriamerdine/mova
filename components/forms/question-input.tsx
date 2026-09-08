'use client'

import { useState } from 'react'
import { Paperclip, Upload } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { SnapshotQuestion } from '@/lib/forms/types'

type FileValue = { path: string; filename: string; size: number; mime: string }

export function QuestionInput({
  question,
  value,
  onChange,
  token,
}: {
  question: SnapshotQuestion
  value: unknown
  onChange: (v: unknown) => void
  token?: string
}) {
  const cfg = question.config

  switch (question.type) {
    case 'long_text':
      return (
        <Textarea
          autoFocus
          rows={4}
          maxLength={cfg.maxLength}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'number':
      return (
        <Input
          autoFocus
          type="number"
          inputMode="decimal"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )

    case 'date':
    case 'birth_date':
      return (
        <Input
          autoFocus
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )

    case 'yes_no':
      return (
        <div className="flex gap-3">
          {[
            { v: true, label: 'Sí' },
            { v: false, label: 'No' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => onChange(o.v)}
              className={cn(
                'flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                value === o.v
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-input hover:bg-muted',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )

    case 'scale': {
      const min = cfg.min ?? 1
      const max = cfg.max ?? 10
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {nums.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={cn(
                  'size-10 rounded-lg border text-sm font-medium transition-colors',
                  value === n
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'border-input hover:bg-muted',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {cfg.minLabel || cfg.maxLabel ? (
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{cfg.minLabel}</span>
              <span>{cfg.maxLabel}</span>
            </div>
          ) : null}
        </div>
      )
    }

    case 'single_select':
      return (
        <SelectInput question={question} value={value} onChange={onChange} multi={false} />
      )
    case 'multi_select':
      return <SelectInput question={question} value={value} onChange={onChange} multi />

    case 'weight':
    case 'height':
    case 'distance':
    case 'duration':
    case 'pace': {
      const cur = (value ?? {}) as { value?: number; unit?: string }
      const unit = cur.unit ?? cfg.unit ?? ''
      return (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            type={question.type === 'pace' || cfg.unit === 'hh:mm' ? 'text' : 'number'}
            inputMode="decimal"
            value={cur.value == null ? '' : String(cur.value)}
            onChange={(e) => {
              const raw = e.target.value
              onChange(raw === '' ? null : { value: Number(raw) || raw, unit })
            }}
            className="flex-1"
          />
          <span className="text-muted-foreground text-sm">{unit}</span>
        </div>
      )
    }

    case 'file':
      return <FileInput question={question} value={value} onChange={onChange} token={token} />

    case 'video':
      return (
        <p className="text-muted-foreground text-sm">
          Este tipo de pregunta todavía no está disponible.
        </p>
      )

    default:
      return (
        <Input
          autoFocus
          maxLength={cfg.maxLength}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileInput({
  question,
  value,
  onChange,
  token,
}: {
  question: SnapshotQuestion
  value: unknown
  onChange: (v: unknown) => void
  token?: string
}) {
  const cur = value && typeof value === 'object' && 'path' in value ? (value as FileValue) : null
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function pick(file: File) {
    if (!token) {
      setErr('Vista previa: la subida no está disponible acá.')
      return
    }
    setErr(null)
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('questionId', question.id)
      const res = await fetch(`/f/${token}/upload`, { method: 'POST', body: fd })
      const json = (await res.json()) as { value?: FileValue; error?: string }
      if (!res.ok || !json.value) {
        setErr(json.error ?? 'No se pudo subir el archivo.')
        return
      }
      onChange(json.value)
    } catch {
      setErr('No se pudo subir el archivo.')
    } finally {
      setBusy(false)
    }
  }

  if (cur) {
    return (
      <div className="border-input flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm">
        <Paperclip className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{cur.filename}</span>
        <span className="text-muted-foreground shrink-0 text-xs">{fmtSize(cur.size)}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-destructive shrink-0 text-xs"
        >
          Quitar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className={cn(
          'border-input flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm',
          busy ? 'opacity-60' : 'hover:bg-muted',
        )}
      >
        <Upload className="size-4" />
        {busy ? 'Subiendo…' : 'Elegir archivo'}
        <input
          type="file"
          className="hidden"
          accept={question.config.accept || undefined}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void pick(f)
            e.target.value = ''
          }}
        />
      </label>
      <p className="text-muted-foreground text-xs">
        {question.config.accept ? `${question.config.accept} · ` : ''}
        hasta {question.config.maxSizeMB || 10} MB
      </p>
      {err ? <p className="text-destructive text-xs">{err}</p> : null}
    </div>
  )
}

function SelectInput({
  question,
  value,
  onChange,
  multi,
}: {
  question: SnapshotQuestion
  value: unknown
  onChange: (v: unknown) => void
  multi: boolean
}) {
  const selected = multi
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : typeof value === 'string'
      ? value
      : ''
  const [other, setOther] = useState(
    typeof value === 'string' && !question.options.some((o) => o.value === value) ? value : '',
  )

  function toggle(v: string) {
    if (multi) {
      const arr = selected as string[]
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
    } else {
      onChange(v)
    }
  }

  const isOn = (v: string) => (multi ? (selected as string[]).includes(v) : selected === v)

  return (
    <div className="flex flex-col gap-2">
      {question.options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => toggle(o.value)}
          className={cn(
            'rounded-xl border px-4 py-3 text-left text-sm transition-colors',
            isOn(o.value)
              ? 'bg-primary text-primary-foreground border-transparent'
              : 'border-input hover:bg-muted',
          )}
        >
          {o.label}
        </button>
      ))}
      {question.config.allowOther ? (
        <Input
          placeholder="Otro…"
          value={other}
          onChange={(e) => {
            setOther(e.target.value)
            if (!multi) onChange(e.target.value)
          }}
        />
      ) : null}
    </div>
  )
}
