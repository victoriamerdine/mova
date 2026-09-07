'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveLoadTargets, type LoadTargetInput } from '@/app/alumnos/[studentId]/actions'

export type PatternOption = { id: string; name: string }
export type LoadTargetRow = { groupId: string; weeklySeries: number | null; intensity: number | null }

export function LoadTargetsForm({
  studentId,
  patterns,
  current,
}: {
  studentId: string
  patterns: PatternOption[]
  current: LoadTargetRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byId = new Map(current.map((r) => [r.groupId, r]))
  const [rows, setRows] = useState<Record<string, LoadTargetInput>>(() =>
    Object.fromEntries(
      patterns.map((p) => [
        p.id,
        {
          groupId: p.id,
          weeklySeries: byId.get(p.id)?.weeklySeries?.toString() ?? '',
          intensity: byId.get(p.id)?.intensity?.toString() ?? '',
        },
      ]),
    ),
  )

  function update(groupId: string, field: 'weeklySeries' | 'intensity', value: string) {
    setRows((prev) => ({ ...prev, [groupId]: { ...prev[groupId], [field]: value } }))
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveLoadTargets(studentId, Object.values(rows))
      if (result.error) setError(result.error)
      else {
        setSaved(true)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-3 gap-y-1.5">
        <span />
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Series/sem
        </span>
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">RPE</span>
        {patterns.map((p) => (
          <div key={p.id} className="col-span-3 grid grid-cols-[1fr_5rem_5rem] items-center gap-x-3">
            <span className="truncate text-sm">{p.name}</span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={rows[p.id]?.weeklySeries ?? ''}
              onChange={(e) => update(p.id, 'weeklySeries', e.target.value)}
              className="h-8"
              aria-label={`Series semanales objetivo — ${p.name}`}
            />
            <Input
              type="number"
              min={0}
              max={10}
              step="0.5"
              value={rows[p.id]?.intensity ?? ''}
              onChange={(e) => update(p.id, 'intensity', e.target.value)}
              className="h-8"
              aria-label={`RPE objetivo — ${p.name}`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {error ? <span className="text-destructive text-xs">{error}</span> : null}
        {saved ? <span className="text-primary text-xs">Guardado ✓</span> : null}
        <Button size="sm" onClick={handleSave} disabled={pending} className="ml-auto">
          <Save data-icon="inline-start" />
          {pending ? 'Guardando…' : 'Guardar objetivos'}
        </Button>
      </div>
    </div>
  )
}
