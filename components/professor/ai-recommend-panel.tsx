'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExerciseCard } from '@/components/library/exercise-card'
import { ExerciseDetailDialog } from '@/components/library/exercise-detail-dialog'
import type { LibraryItem } from '@/lib/library'

export function AiRecommendPanel({
  studentId,
  studentName,
}: {
  studentId: string
  studentName: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<string | null>(null)
  const [results, setResults] = useState<LibraryItem[]>([])
  const [selected, setSelected] = useState<LibraryItem | null>(null)

  async function run() {
    if (loading) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    setResults([])
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentId, query: query.trim() || undefined }),
      })
      const json = (await res.json()) as {
        answer?: string
        exercises?: LibraryItem[]
        error?: string
      }
      if (!res.ok) {
        setError(json.error ?? 'No se pudo pedir recomendaciones.')
        return
      }
      setAnswer(json.answer ?? '')
      setResults(json.exercises ?? [])
    } catch {
      setError('No se pudo pedir recomendaciones.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Sparkles data-icon="inline-start" />
          Recomendaciones de la IA
        </Button>
      ) : (
        <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">
            La IA propone ejercicios de tu biblioteca según el deporte, nivel y equipamiento de{' '}
            {studentName}. Vos elegís qué usar — no arma el plan.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              placeholder="Afiná el pedido (opcional): ej. potencia de tren inferior, pretemporada…"
              maxLength={500}
              className="min-w-56 flex-1"
            />
            <Button size="sm" disabled={loading} onClick={run}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? 'Pensando…' : 'Pedir recomendaciones'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              Cerrar
            </Button>
          </div>

          {error ? <p className="text-destructive text-xs">{error}</p> : null}

          {answer ? (
            <p className="text-foreground/90 border-primary/20 bg-primary/[0.03] rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap">
              {answer}
            </p>
          ) : null}

          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} onSelect={() => setSelected(ex)} />
              ))}
            </div>
          ) : null}

          {answer && results.length === 0 && !error ? (
            <p className="text-muted-foreground text-xs">
              La IA no encontró ejercicios apropiados en tu biblioteca para este pedido.
            </p>
          ) : null}

          <p className="text-muted-foreground text-[11px]">
            Solo recomienda ejercicios que ya están en tu biblioteca. No inventa ni prescribe cargas.
          </p>
        </div>
      )}

      <ExerciseDetailDialog
        exercise={selected}
        canManage={false}
        deleting={false}
        onClose={() => setSelected(null)}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </>
  )
}
