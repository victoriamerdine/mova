'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/** CLAUDE.md §33.4 — pedir un borrador de plan con IA, para un alumno (profesor) o para uno mismo (individuo). */
export function AiDraftPanel({ studentId, forSelf }: { studentId: string; forSelf: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    if (loading || !prompt.trim()) return
    setLoading(true)
    setError(null)
    setDone(false)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentId, prompt: prompt.trim() }),
      })
      const json = (await res.json()) as { draftId?: string; error?: string }
      if (!res.ok) {
        setError(json.error ?? 'No se pudo generar el borrador.')
        return
      }
      setDone(true)
      setPrompt('')
      router.refresh()
    } catch {
      setError('No se pudo generar el borrador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Sparkles data-icon="inline-start" />
          Generar borrador con IA
        </Button>
      ) : (
        <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">
            Describí qué plan querés{forSelf ? ' para vos' : ' para tu alumno'} — objetivo, deporte,
            semanas, sesiones por semana. La IA arma un borrador con ejercicios reales de la
            biblioteca; queda pendiente de tu revisión, no se aplica solo.
          </p>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej. 4 semanas para un corredor de 10K, 3 sesiones por semana, nivel intermedio."
            maxLength={1000}
            rows={3}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={loading || !prompt.trim()} onClick={submit}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? 'Generando…' : 'Generar borrador'}
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
          {done ? (
            <p className="text-muted-foreground text-xs">
              Borrador listo — lo encontrás abajo, en &quot;Borradores pendientes&quot;.
            </p>
          ) : null}

          <p className="text-muted-foreground text-[11px]">
            Puede tardar un rato con pedidos amplios. Nunca inventa ejercicios ni videos: usa solo lo
            que ya está en la biblioteca.
          </p>
        </div>
      )}
    </>
  )
}
