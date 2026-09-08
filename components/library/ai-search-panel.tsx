'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ExerciseCard } from '@/components/library/exercise-card'
import type { LibraryItem } from '@/lib/library'

const EXAMPLES = [
  '¿Qué ejercicios tengo para trabajar anti-rotación?',
  'Ejercicios de potencia de tren inferior con video',
  'Opciones unilaterales de empuje para pádel',
]

export function AiSearchPanel({ onSelect }: { onSelect: (ex: LibraryItem) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<string | null>(null)
  const [results, setResults] = useState<LibraryItem[]>([])

  async function ask(q: string) {
    const text = q.trim()
    if (text.length < 3 || loading) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    setResults([])
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: text }),
      })
      const json = (await res.json()) as { answer?: string; exercises?: LibraryItem[]; error?: string }
      if (!res.ok) {
        setError(json.error ?? 'No se pudo consultar la IA.')
        return
      }
      setAnswer(json.answer ?? '')
      setResults(json.exercises ?? [])
    } catch {
      setError('No se pudo consultar la IA.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-4 mt-3 sm:mx-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border-border bg-card text-foreground flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium"
      >
        <Sparkles className="text-primary size-4" />
        Preguntar a la IA
        <span className="text-muted-foreground ml-auto text-xs">{open ? 'ocultar' : 'abrir'}</span>
      </button>

      {open ? (
        <div className="border-border bg-card mt-2 flex flex-col gap-3 rounded-xl border p-3">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ask(query)
            }}
            rows={2}
            placeholder="Describí qué ejercicios buscás…"
            maxLength={500}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={loading || query.trim().length < 3} onClick={() => ask(query)}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? 'Buscando…' : 'Preguntar'}
            </Button>
            {!answer && !loading
              ? EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setQuery(ex)
                      ask(ex)
                    }}
                    className="text-muted-foreground hover:text-foreground rounded-full border border-dashed px-2.5 py-1 text-xs"
                  >
                    {ex}
                  </button>
                ))
              : null}
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
                <ExerciseCard key={ex.id} exercise={ex} onSelect={() => onSelect(ex)} />
              ))}
            </div>
          ) : null}

          {answer && results.length === 0 && !error ? (
            <p className="text-muted-foreground text-xs">
              La IA no encontró ejercicios para citar. Probá con otros términos o revisá los filtros
              de abajo.
            </p>
          ) : null}

          <p className="text-muted-foreground text-[11px]">
            La IA solo busca dentro de tu biblioteca real. No inventa ejercicios ni videos.
          </p>
        </div>
      ) : null}
    </div>
  )
}
