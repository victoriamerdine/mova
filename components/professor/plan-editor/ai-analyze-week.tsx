'use client'

import { useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Group = { group: string; series: number; intensityAvg: number | null }
type Alert = { level: 'info' | 'atencion'; text: string }

export function AiAnalyzeWeek({
  planId,
  weekLabel,
  sessions,
  weekly,
  targets,
  byDay,
}: {
  planId: string
  weekLabel: string
  sessions: number
  weekly: Group[]
  targets: { group: string; weeklySeries: number | null; intensity: number | null }[]
  byDay: { name: string; groups: { group: string; series: number }[] }[]
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])

  const hasVolume = weekly.some((g) => g.series > 0)

  async function run() {
    if (loading) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    setAlerts([])
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId, weekLabel, sessions, weekly, targets, byDay }),
      })
      const json = (await res.json()) as { answer?: string; alerts?: Alert[]; error?: string }
      if (!res.ok) {
        setError(json.error ?? 'No se pudo analizar.')
        return
      }
      setAnswer(json.answer ?? '')
      setAlerts(json.alerts ?? [])
    } catch {
      setError('No se pudo analizar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={run} disabled={loading || !hasVolume}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {loading ? 'Analizando…' : 'Analizar la semana con IA'}
        </Button>
        {answer ? (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Cerrar análisis"
            onClick={() => {
              setAnswer(null)
              setAlerts([])
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-destructive mt-2 text-xs">{error}</p> : null}

      {answer ? (
        <div className="border-primary/20 bg-primary/[0.03] mt-2 flex flex-col gap-2 rounded-lg border p-3">
          {alerts.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {alerts.map((a, i) => (
                <li
                  key={i}
                  className={
                    a.level === 'atencion'
                      ? 'text-warning-foreground text-xs'
                      : 'text-muted-foreground text-xs'
                  }
                >
                  • {a.text}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-foreground/90 text-sm whitespace-pre-wrap">{answer}</p>
          <p className="text-muted-foreground text-[11px]">
            Información para que decidas vos. La IA no modifica el plan.
          </p>
        </div>
      ) : null}
    </div>
  )
}
