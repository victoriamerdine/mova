'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CircleCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StudentExerciseCard } from '@/components/student/student-exercise-card'
import { finishDay } from '@/app/alumno/actions'
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

export function StudentDayScreen({ day }: { day: StudentDay }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState(day.feelingNote ?? '')
  const [done, setDone] = useState(!!day.sessionCompletedAt)
  const [error, setError] = useState<string | null>(null)

  const totalItems = day.blocks.reduce((n, b) => n + b.items.length, 0)

  function finish() {
    setError(null)
    startTransition(async () => {
      const res = await finishDay(day.workoutId, note)
      if (res.error) setError(res.error)
      else {
        setDone(true)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Link
        href="/alumno"
        className="text-muted-foreground hover:text-foreground -mb-1 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <header className="space-y-0.5">
        <p className="text-primary text-[11px] font-bold tracking-widest uppercase">
          {day.planName} · Semana {day.weekNumber}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{day.name}</h1>
        {day.objective ? <p className="text-muted-foreground text-sm">{day.objective}</p> : null}
      </header>

      {done ? (
        <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-xl border p-3 text-sm">
          <CircleCheck className="size-4 shrink-0" />
          Sesión registrada. Podés volver a hacerla cuando toque otra vez.
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        {day.blocks.map((block) => {
          const label = BLOCK_LABEL[block.kind]
          const combined = block.kind === 'COMBINADO' || block.kind === 'CIRCUITO'
          return (
            <section key={block.id} className="flex flex-col gap-3">
              {label ? (
                <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase">
                  <span className="bg-primary size-1.5 rounded-full" />
                  {label}
                  {combined && block.rounds ? ` · ${block.rounds} vueltas` : ''}
                </p>
              ) : null}
              {block.items.map((item) => (
                <StudentExerciseCard
                  key={item.id}
                  workoutId={day.workoutId}
                  item={item}
                  blockHasRounds={combined}
                  rounds={block.rounds}
                />
              ))}
            </section>
          )
        })}
      </div>

      {totalItems > 0 ? (
        <div className="border-border mt-2 flex flex-col gap-2 rounded-2xl border p-4">
          <p className="text-sm font-medium">¿Cómo te fue?</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Cómo te sentiste, molestias, energía… (lo ve tu profe)"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <Button onClick={finish} disabled={pending} className="w-full">
            {pending ? 'Guardando…' : done ? 'Actualizar sesión' : 'Terminar sesión'}
          </Button>
        </div>
      ) : null}
    </>
  )
}
