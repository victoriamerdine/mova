'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, Play, Timer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StudentExerciseCard } from '@/components/student/student-exercise-card'
import { finishDay, startDaySession } from '@/app/alumno/actions'
import { DIFFICULTY_LABEL, DIFFICULTY_OPTIONS } from '@/lib/student-difficulty'
import type { SessionDifficulty } from '@/lib/student-difficulty'
import type { StudentDay } from '@/lib/supabase/queries/student-plan'

const BLOCK_LABEL: Record<string, string> = {
  CALENTAMIENTO: 'Calentamiento',
  ACTIVACION: 'Activación',
  MOVILIDAD: 'Movilidad',
  RECUPERACION: 'Recuperación',
  TECNICA: 'Técnica',
  TACTICA: 'Táctica',
  COMBINADO: 'Serie combinada — alterná estos ejercicios',
  CIRCUITO: 'Circuito — una serie de cada uno',
}

/** "M:SS" hasta 1 h, después "H:MM:SS". */
function fmtClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

/** Bloques + "iniciar/cronómetro" + "¿cómo te fue?" + terminar. Se usa en la
 * ruta /alumno/dia/[id] y embebido en las tabs de la semana. */
export function StudentDayContent({ day }: { day: StudentDay }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState(day.feelingNote ?? '')
  const [difficulty, setDifficulty] = useState<SessionDifficulty | null>(day.difficulty)
  const [done, setDone] = useState(!!day.sessionCompletedAt)
  const [error, setError] = useState<string | null>(null)
  // Cronómetro del día: arranca cuando el alumno toca "Iniciar" (o al
  // registrar el primer ejercicio). No se limpia solo — así el total queda
  // congelado en pantalla después de terminar.
  const [startedAt, setStartedAt] = useState<string | null>(day.sessionStartedAt)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Al cambiar de día en las tabs, resetear el estado local.
  useEffect(() => {
    setNote(day.feelingNote ?? '')
    setDifficulty(day.difficulty)
    setDone(!!day.sessionCompletedAt)
    setError(null)
    setStartedAt(day.sessionStartedAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.workoutId])

  // Adoptar un inicio que ya exista en el server (sesión abierta desde otro
  // dispositivo, o creada al registrar un ejercicio). Nunca lo borra.
  useEffect(() => {
    if (day.sessionStartedAt) setStartedAt((cur) => cur ?? day.sessionStartedAt)
  }, [day.sessionStartedAt])

  // Tic del cronómetro mientras la sesión está en curso.
  useEffect(() => {
    if (!startedAt || done) return
    setNowMs(Date.now())
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startedAt, done])

  const totalItems = day.blocks.reduce((n, b) => n + b.items.length, 0)
  const elapsedSec = startedAt ? (nowMs - Date.parse(startedAt)) / 1000 : 0

  function start() {
    setError(null)
    startTransition(async () => {
      const res = await startDaySession(day.workoutId)
      if (res.error) setError(res.error)
      else {
        setStartedAt(new Date().toISOString())
        setNowMs(Date.now())
        router.refresh()
      }
    })
  }

  function finish() {
    setError(null)
    startTransition(async () => {
      const res = await finishDay(day.workoutId, note, difficulty)
      if (res.error) setError(res.error)
      else {
        setDone(true)
        router.refresh()
      }
    })
  }

  return (
    <>
      {done ? (
        <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-xl border p-3 text-sm">
          <CircleCheck className="size-4 shrink-0" />
          Sesión registrada
          {startedAt ? ` · ${fmtClock(elapsedSec)}` : ''}. Podés volver a hacerla cuando toque otra
          vez.
        </div>
      ) : totalItems === 0 ? null : startedAt ? (
        <div className="border-primary/30 bg-primary/5 text-primary flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Timer className="size-4 shrink-0" />
            En curso
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {fmtClock(elapsedSec)}
          </span>
        </div>
      ) : (
        <Button onClick={start} disabled={pending} className="w-full">
          <Play data-icon="inline-start" />
          {pending ? 'Iniciando…' : 'Iniciar'}
        </Button>
      )}

      {totalItems === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Este día todavía no tiene ejercicios cargados. Avisale a tu profe.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {day.blocks.map((block) => {
            const label = BLOCK_LABEL[block.kind]
            const combined = block.kind === 'COMBINADO' || block.kind === 'CIRCUITO'
            if (block.items.length === 0) return null
            return (
              <section key={block.id} className="flex flex-col gap-3">
                {label ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase">
                    <span className="bg-primary size-1.5 rounded-full" />
                    {label}
                    {combined && block.rounds ? ` · ${block.rounds} series` : ''}
                  </p>
                ) : null}
                {combined && block.items.length > 1 ? (
                  <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
                    {block.items.map((item) => (
                      <div key={item.id} className="w-[86%] shrink-0 snap-start sm:w-[22rem]">
                        <StudentExerciseCard
                          workoutId={day.workoutId}
                          item={item}
                          blockHasRounds
                          rounds={block.rounds}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  block.items.map((item) => (
                    <StudentExerciseCard
                      key={item.id}
                      workoutId={day.workoutId}
                      item={item}
                      blockHasRounds={combined}
                      rounds={block.rounds}
                    />
                  ))
                )}
              </section>
            )
          })}
        </div>
      )}

      {totalItems > 0 && !done ? (
        <div className="border-border mt-2 flex flex-col gap-3 rounded-2xl border p-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">¿Qué tan exigente lo sentiste?</p>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDifficulty(difficulty === opt ? null : opt)}
                  className={
                    'flex-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (difficulty === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground')
                  }
                >
                  {DIFFICULTY_LABEL[opt]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">¿Cómo te fue?</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Cómo te sentiste, molestias, energía… (lo ve tu profe)"
            />
          </div>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <Button onClick={finish} disabled={pending} className="w-full">
            {pending ? 'Guardando…' : 'Terminar sesión'}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Si no registrás nada, se toma como que hiciste todo lo del día.
          </p>
        </div>
      ) : null}
    </>
  )
}
