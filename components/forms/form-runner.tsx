'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { QuestionInput } from '@/components/forms/question-input'
import { createClient } from '@/lib/supabase/client'
import { evaluateRules } from '@/lib/forms/rules'
import { structureHasSensitive } from '@/lib/forms/types'
import type { SnapshotQuestion, SubmissionView } from '@/lib/forms/types'

type Phase = 'loading' | 'error' | 'intro' | 'consent' | 'question' | 'review' | 'sent' | 'closed'

function isAnswered(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true
}

export function FormRunner({ token }: { token: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [view, setView] = useState<SubmissionView | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [index, setIndex] = useState(0)
  const [consentGiven, setConsentGiven] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlash = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carga inicial
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_submission', { p_token: token })
      if (cancelled) return
      if (error || !data) {
        setErrorMsg('No encontramos este formulario.')
        setPhase('error')
        return
      }
      const v = data as unknown as SubmissionView
      setView(v)
      setAnswers(v.answers ?? {})
      setConsentGiven(v.consentAccepted)
      const savedIndex = Number((v.progress as { index?: number })?.index ?? 0)
      setIndex(Number.isFinite(savedIndex) ? savedIndex : 0)
      if (v.status === 'expired') setPhase('closed')
      else if (v.status === 'completed') setPhase('sent')
      else if (v.status === 'started') setPhase('question')
      else setPhase('intro')
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, token])

  const structure = view?.structure

  const visibleQuestions: SnapshotQuestion[] = useMemo(() => {
    if (!structure) return []
    const { hiddenQuestionIds } = evaluateRules(structure, answers)
    return structure.sections
      .flatMap((s) => s.questions.map((q) => ({ q, sectionSensitive: s.sensitive })))
      .filter(({ q }) => !hiddenQuestionIds.has(q.id))
      .map(({ q, sectionSensitive }) => ({ ...q, sensitive: q.sensitive || sectionSensitive }))
  }, [structure, answers])

  const requiredNow = useMemo(() => {
    if (!structure) return new Set<string>()
    return evaluateRules(structure, answers).requiredQuestionIds
  }, [structure, answers])

  const flush = useCallback(
    async (nextAnswers: Record<string, unknown>, nextIndex: number) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      setSaveState('saving')
      const { error } = await supabase.rpc('save_submission_answers', {
        p_token: token,
        p_answers: nextAnswers as never,
        p_progress: { index: nextIndex } as never,
      })
      if (error) {
        console.error('save_submission_answers falló:', error.message)
        setSaveState('error')
      } else {
        setSaveState('saved')
        if (savedFlash.current) clearTimeout(savedFlash.current)
        savedFlash.current = setTimeout(() => setSaveState('idle'), 2000)
      }
      return error
    },
    [supabase, token],
  )

  const persist = useCallback(
    (nextAnswers: Record<string, unknown>, nextIndex: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void flush(nextAnswers, nextIndex)
      }, 500)
    },
    [flush],
  )

  function setAnswer(qid: string, value: unknown) {
    const next = { ...answers, [qid]: value }
    setAnswers(next)
    persist(next, index)
  }

  async function begin() {
    setBusy(true)
    await supabase.rpc('start_submission', { p_token: token })
    setBusy(false)
    setPhase(needsConsentBefore(0) ? 'consent' : 'question')
  }

  function needsConsentBefore(i: number): boolean {
    if (!structure || consentGiven) return false
    return visibleQuestions.slice(0, i + 1).some((q) => q.sensitive)
  }

  function goNext() {
    const q = visibleQuestions[index]
    const required = q.required || requiredNow.has(q.id)
    if (required && !isAnswered(answers[q.id])) {
      setErrorMsg('Esta pregunta es obligatoria.')
      return
    }
    setErrorMsg(null)
    const ni = index + 1
    persist(answers, ni)
    if (ni >= visibleQuestions.length) {
      setPhase('review')
    } else {
      setIndex(ni)
      if (needsConsentBefore(ni)) setPhase('consent')
    }
  }

  function goBack() {
    setErrorMsg(null)
    if (index === 0) setPhase('intro')
    else setIndex(index - 1)
  }

  async function submit() {
    setBusy(true)
    setErrorMsg(null)
    // Guardar lo último antes de cerrar — sin esperar al debounce.
    const saveErr = await flush(answers, index)
    if (saveErr) {
      setBusy(false)
      setErrorMsg(saveErr.message)
      return
    }
    const { error } = await supabase.rpc('complete_submission', {
      p_token: token,
      p_consent: consentGiven,
    })
    setBusy(false)
    if (error) setErrorMsg(error.message)
    else setPhase('sent')
  }

  // ---------- render ----------
  if (phase === 'loading') {
    return (
      <Shell>
        <Loader2 className="text-muted-foreground mx-auto size-6 animate-spin" />
      </Shell>
    )
  }

  if (phase === 'error') {
    return (
      <Shell>
        <p className="text-center text-sm">{errorMsg}</p>
      </Shell>
    )
  }

  if (phase === 'closed') {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Formulario vencido</h1>
        <p className="text-muted-foreground text-sm">
          Este link ya no está disponible. Pedile a tu profe uno nuevo.
        </p>
      </Shell>
    )
  }

  if (phase === 'sent') {
    return (
      <Shell>
        <div className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-full">
          <Check className="size-7" />
        </div>
        <h1 className="text-lg font-semibold">Formulario enviado correctamente</h1>
        <p className="text-muted-foreground text-sm">Ya podés cerrar esta página. ¡Gracias!</p>
      </Shell>
    )
  }

  if (phase === 'intro') {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">{view?.formName}</h1>
        <p className="text-muted-foreground text-sm">
          Tu profesor te envió este formulario. Son {visibleQuestions.length} preguntas y podés
          pausar y seguir después con el mismo link.
        </p>
        <Button className="w-full" onClick={begin} disabled={busy}>
          Comenzar
        </Button>
      </Shell>
    )
  }

  if (phase === 'consent') {
    return (
      <Shell>
        <h1 className="text-base font-semibold">Información sensible</h1>
        <p className="text-muted-foreground text-sm">
          Algunas preguntas piden datos sobre lesiones o restricciones. Se comparten solo con tu
          profesor, para adaptar tu plan. Podés dejarlas en blanco si preferís.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setConsentGiven(false)
              setPhase('question')
            }}
          >
            Ahora no
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              setConsentGiven(true)
              setPhase('question')
            }}
          >
            Entiendo, continuar
          </Button>
        </div>
      </Shell>
    )
  }

  // phase === 'review'
  if (phase === 'review') {
    const answered = visibleQuestions.filter((q) => isAnswered(answers[q.id])).length
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Todo listo</h1>
        <p className="text-muted-foreground text-sm">
          Respondiste {answered} de {visibleQuestions.length} preguntas.
        </p>
        {errorMsg ? <p className="text-destructive text-sm">{errorMsg}</p> : null}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setPhase('question')}>
            Revisar
          </Button>
          <Button className="flex-1" onClick={submit} disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
      </Shell>
    )
  }

  // phase === 'question'
  const q = visibleQuestions[index]
  if (!q) {
    return (
      <Shell>
        <Button className="w-full" onClick={() => setPhase('review')}>
          Continuar
        </Button>
      </Shell>
    )
  }
  const pct = Math.round(((index + 1) / Math.max(visibleQuestions.length, 1)) * 100)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-5 py-6">
      <div className="bg-muted mb-6 h-1 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-muted-foreground mb-4 flex items-center justify-between text-xs">
        <span>
          Pregunta {index + 1} de {visibleQuestions.length}
        </span>
        <SaveStatus state={saveState} />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h2 className="text-base font-medium">
            {q.label}
            {q.required || requiredNow.has(q.id) ? <span className="text-destructive"> *</span> : null}
          </h2>
          {q.helpText ? <p className="text-muted-foreground mt-1 text-sm">{q.helpText}</p> : null}
        </div>

        <QuestionInput
          question={q}
          value={answers[q.id]}
          onChange={(v) => setAnswer(q.id, v)}
          token={token}
        />

        {errorMsg ? <p className="text-destructive text-sm">{errorMsg}</p> : null}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Atrás">
          <ArrowLeft className="size-4" />
        </Button>
        <Button className="flex-1" onClick={goNext}>
          {index + 1 >= visibleQuestions.length ? 'Terminar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-4 px-5 py-10 text-center">
      {children}
    </div>
  )
}

function SaveStatus({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null
  if (state === 'saving')
    return (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Guardando…
      </span>
    )
  if (state === 'saved')
    return (
      <span className="text-primary inline-flex items-center gap-1">
        <Check className="size-3" />
        Guardado
      </span>
    )
  return (
    <span className="text-destructive">Sin guardar — se reintenta al continuar</span>
  )
}
