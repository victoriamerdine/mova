'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BLOCK_KIND_LABEL } from '@/lib/plan-blocks'
import type { PendingDraft } from '@/app/planes/draft-actions'
import { applyPlanDraft, rejectPlanDraft } from '@/app/planes/draft-actions'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Revisión de borradores de IA pendientes (CLAUDE.md §33.4) — aprobar crea el plan real, rechazar lo descarta. */
export function PendingDraftsPanel({ studentId, drafts }: { studentId: string; drafts: PendingDraft[] }) {
  const router = useRouter()

  if (drafts.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft) => (
        <DraftCard key={draft.id} studentId={studentId} draft={draft} router={router} />
      ))}
    </div>
  )
}

function DraftCard({
  studentId,
  draft,
  router,
}: {
  studentId: string
  draft: PendingDraft
  router: ReturnType<typeof useRouter>
}) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function approve() {
    setError(null)
    startTransition(async () => {
      const res = await applyPlanDraft(draft.id)
      if (res.error) {
        setError(res.error)
        return
      }
      if (res.planId) router.push(`/planes/${res.planId}`)
    })
  }

  function reject() {
    setError(null)
    startTransition(async () => {
      const res = await rejectPlanDraft(draft.id, studentId)
      if (res.error) setError(res.error)
    })
  }

  const totalDays = draft.payload.weeks.reduce((n, w) => n + w.days.length, 0)

  return (
    <div className="border-border rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{draft.payload.planName}</p>
          <p className="text-muted-foreground text-xs">
            {draft.payload.weeks.length} semana{draft.payload.weeks.length === 1 ? '' : 's'} ·{' '}
            {totalDays} día{totalDays === 1 ? '' : 's'} · {formatDate(draft.createdAt)}
          </p>
          {draft.prompt ? (
            <p className="text-muted-foreground mt-1 text-xs italic">&quot;{draft.prompt}&quot;</p>
          ) : null}
        </div>
        <Badge variant="outline" className="shrink-0">
          Pendiente
        </Badge>
      </div>

      <p className="text-foreground/90 mt-2 text-sm whitespace-pre-wrap">{draft.payload.summary}</p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 text-xs"
      >
        <ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        {expanded ? 'Ocultar detalle' : 'Ver detalle'}
      </button>

      {expanded ? (
        <div className="mt-2 flex flex-col gap-3 border-t pt-2">
          {draft.payload.weeks.map((week, wi) => (
            <div key={wi}>
              <p className="text-xs font-medium">
                Semana {wi + 1}
                {week.name ? ` — ${week.name}` : ''}
              </p>
              <div className="mt-1 flex flex-col gap-2 pl-2">
                {week.days.map((day, di) => (
                  <div key={di}>
                    <p className="text-muted-foreground text-xs font-medium">{day.name}</p>
                    <ul className="pl-2">
                      {day.blocks.map((block, bi) => (
                        <li key={bi} className="text-muted-foreground text-xs">
                          <span className="font-medium">{BLOCK_KIND_LABEL[block.kind]}</span>
                          {block.rounds ? ` · ${block.rounds} vueltas` : ''}
                          <ul className="pl-3">
                            {block.items.map((item, ii) => (
                              <li key={ii}>
                                {item.activityName ??
                                  (item.exerciseId ? draft.exerciseNames[item.exerciseId] : null) ??
                                  '(ejercicio no verificado)'}
                                {item.sets ? ` · ${item.sets}x${item.reps ?? ''}` : ''}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-destructive mt-2 text-xs">{error}</p> : null}

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={approve}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Aprobar y crear plan
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={reject}>
          Rechazar
        </Button>
      </div>
    </div>
  )
}
