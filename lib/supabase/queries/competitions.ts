import { createClient } from '@/lib/supabase/server'

export type CompetitionType =
  | 'partido'
  | 'carrera'
  | 'torneo'
  | 'campeonato'
  | 'competencia'
  | 'test'
  | 'evento'
  | 'descanso'
  | 'recuperacion'

export type Competition = {
  id: string
  sportId: string | null
  sportName: string | null
  date: string
  time: string | null
  type: CompetitionType
  importance: string | null
  location: string | null
  notes: string | null
}

type CompetitionRow = {
  id: string
  sport_id: string | null
  date: string
  time: string | null
  type: CompetitionType
  importance: string | null
  location: string | null
  notes: string | null
  sports: { name: string } | null
}

function toCompetition(r: CompetitionRow): Competition {
  return {
    id: r.id,
    sportId: r.sport_id,
    sportName: r.sports?.name ?? null,
    date: r.date,
    time: r.time,
    type: r.type,
    importance: r.importance,
    location: r.location,
    notes: r.notes,
  }
}

/** Competencias/eventos de un alumno (CLAUDE.md §27), más próximos primero. */
export async function getStudentCompetitions(studentId: string): Promise<Competition[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competitions')
    .select('id, sport_id, date, time, type, importance, location, notes, sports(name)')
    .eq('student_id', studentId)
    .order('date', { ascending: true })

  if (error || !data) return []
  return (data as unknown as CompetitionRow[]).map(toCompetition)
}

export type CalendarItem = Competition & {
  studentId: string
  studentName: string
}

/**
 * Todas las competencias/eventos que el usuario logueado puede ver — RLS
 * hace el recorte: un profesor ve los de todos sus alumnos activos, un
 * alumno (o individuo autocoacheado) ve los suyos. Pensada para el
 * calendario agregado del profesor (`/calendario`).
 */
export async function getCalendarItems(): Promise<CalendarItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competitions')
    .select(
      'id, student_id, sport_id, date, time, type, importance, location, notes, sports(name), students(profiles(full_name))',
    )
    .order('date', { ascending: true })

  if (error || !data) return []

  const rows = data as unknown as (CompetitionRow & {
    student_id: string
    students: { profiles: { full_name: string } | null } | null
  })[]

  return rows.map((r) => ({
    ...toCompetition(r),
    studentId: r.student_id,
    studentName: r.students?.profiles?.full_name ?? 'Alumno',
  }))
}
