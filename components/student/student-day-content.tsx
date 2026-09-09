'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StudentExerciseCard } from '@/components/student/student-exercise-card'
import { finishDay } from '@/app/alumno/actions'
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
  CIRCUITO: 'Circuito — una vuelta de cada uno',
}

/** Bloques + "¿cómo te fue?" + terminar. Se usa en la ruta /alumno/dia/[id]
 * y embebido en las tabs de la semana. */
export function StudentDayContent({ day }: { day: StudentDay }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState(day.feelingNote ?? '')
  const [difficulty, setDifficulty] = useState<SessionDifficulty | null>(day.difficulty)
  const [done, setDone] = useState(!!day.sessionCompletedAt)
  const [error, setError] = useState<string | null>(null)

  // Al cambiar de día en las tabs, resetear el estado local.
  useEffect(() => {
    setNote(day.feelingNote ?? '')
    setDifficulty(day.difficulty)
    setDone(!!day.sessionCompletedAt)
    setError(null)
  }, [day.workoutId, day.feelingNote, day.difficulty, day.sessionCompletedAt])

  const totalItems = day.blocks.reduce((n, b) => n + b.items.length, 0)

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
          Sesión registrada. Podés volver a hacerla cuando toque otra vez.
        </div>
      ) : null}

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
                    {combined && block.rounds ? ` · ${block.rounds} vueltas` : ''}
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

      {totalItems > 0 ? (
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
            {pending ? 'Guardando…' : done ? 'Actualizar sesión' : 'Terminar sesión'}
          </Button>
        </div>
      ) : null}
    </>
  )
}
