import { MessageSquareText } from 'lucide-react'

import { DIFFICULTY_LABEL } from '@/lib/student-difficulty'
import type { ProgressSession } from '@/lib/supabase/queries/student-progress'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function setLine(s: { loadKg: number | null; reps: string | null; rpe: number | null }) {
  const parts: string[] = []
  if (s.reps != null && s.reps !== '') parts.push(`${s.reps} reps`)
  if (s.loadKg != null) parts.push(`${s.loadKg} kg`)
  if (s.rpe != null) parts.push(`RPE ${s.rpe}`)
  return parts.length > 0 ? parts.join(' · ') : 'sin datos'
}

/** El alumno registra N series iguales (misma carga/reps). Si todas
 *  coinciden, mostrar una sola línea "N series · …"; si no, por serie. */
function uniform(sets: { loadKg: number | null; reps: string | null; rpe: number | null }[]) {
  if (sets.length < 2) return false
  const [a] = sets
  return sets.every((s) => s.loadKg === a.loadKg && s.reps === a.reps && s.rpe === a.rpe)
}

export function StudentProgressPanel({ sessions }: { sessions: ProgressSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground px-5 py-10 text-center text-sm">
        Todavía no completó ninguna sesión.
      </p>
    )
  }

  return (
    <ul className="divide-border divide-y">
      {sessions.map((s) => (
        <li key={s.sessionId} className="px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-sm font-medium">{s.workoutName}</p>
            <p className="text-muted-foreground text-xs">
              {fmtDate(s.completedAt)}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            {s.planName}
            {s.weekNumber != null ? ` · Semana ${s.weekNumber}` : ''}
          </p>

          {s.difficulty ? (
            <span className="border-border text-muted-foreground mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium">
              Lo sintió: {DIFFICULTY_LABEL[s.difficulty]}
            </span>
          ) : null}

          {s.feelingNote ? (
            <div className="bg-muted/50 text-foreground mt-2.5 flex gap-2 rounded-lg px-3 py-2 text-sm">
              <MessageSquareText className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <span className="whitespace-pre-wrap">{s.feelingNote}</span>
            </div>
          ) : null}

          {s.exercises.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2.5">
              {s.exercises.map((ex) => (
                <div key={ex.trainingItemId}>
                  <p className="text-xs font-medium">{ex.name}</p>
                  {uniform(ex.sets) ? (
                    <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                      {ex.sets.length} series · {setLine(ex.sets[0])}
                    </p>
                  ) : (
                    <ul className="text-muted-foreground mt-0.5 flex flex-col gap-0.5 text-xs">
                      {ex.sets.map((set) => (
                        <li key={set.setNumber} className="flex gap-2">
                          <span className="text-muted-foreground/70 tabular-nums">
                            {set.setNumber}.
                          </span>
                          <span className="tabular-nums">{setLine(set)}</span>
                          {set.comments ? (
                            <span className="text-muted-foreground/80 italic">— {set.comments}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mt-2 text-xs italic">
              Terminó la sesión sin registrar series.
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
