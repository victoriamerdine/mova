import { createClient } from '@/lib/supabase/server'
import { expandWeeklyRecurrence } from '@/lib/calendar-recurrence'

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
  /** Presente si esta fila es una ocurrencia generada de una serie recurrente (cancelable), no una competencia puntual. */
  recurrenceId?: string
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

/** Competencias/eventos puntuales (no recurrentes) de un alumno, más próximos primero. */
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

export type CompetitionRecurrence = {
  id: string
  sportId: string | null
  sportName: string | null
  type: CompetitionType
  /** 0 = domingo .. 6 = sábado. */
  weekday: number
  location: string | null
  notes: string | null
  startDate: string
  endDate: string | null
}

/** Series recurrentes ("partido todos los domingos") de un alumno. */
export async function getStudentRecurrences(studentId: string): Promise<CompetitionRecurrence[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competition_recurrences')
    .select('id, sport_id, type, weekday, location, notes, start_date, end_date, sports(name)')
    .eq('student_id', studentId)
    .order('weekday', { ascending: true })

  if (error || !data) return []

  const rows = data as unknown as {
    id: string
    sport_id: string | null
    type: CompetitionType
    weekday: number
    location: string | null
    notes: string | null
    start_date: string
    end_date: string | null
    sports: { name: string } | null
  }[]

  return rows.map((r) => ({
    id: r.id,
    sportId: r.sport_id,
    sportName: r.sports?.name ?? null,
    type: r.type,
    weekday: r.weekday,
    location: r.location,
    notes: r.notes,
    startDate: r.start_date,
    endDate: r.end_date,
  }))
}

/** Ventana en la que se expanden las series recurrentes en ocurrencias concretas. */
function recurrenceWindow(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - 30)
  const to = new Date(now)
  to.setUTCDate(to.getUTCDate() + 365)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

type OccurrenceWithStudent = Competition & { studentId: string; studentName: string | null }

/**
 * Expande las series recurrentes visibles (RLS: is_own_student /
 * is_professor_of) en ocurrencias puntuales dentro de la ventana del
 * calendario, salteando las fechas canceladas
 * (`competition_recurrence_exceptions`). `filterStudentId` opcional —
 * sin él, trae las de todos los alumnos que el usuario logueado puede ver
 * (uso del calendario agregado del profesor).
 */
async function getRecurrenceOccurrences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filterStudentId?: string,
): Promise<OccurrenceWithStudent[]> {
  let query = supabase
    .from('competition_recurrences')
    .select(
      'id, student_id, sport_id, type, weekday, location, notes, start_date, end_date, sports(name), students(profiles(full_name))',
    )
  if (filterStudentId) query = query.eq('student_id', filterStudentId)
  const { data: recurrences } = await query

  type RecurrenceRow = {
    id: string
    student_id: string
    sport_id: string | null
    type: CompetitionType
    weekday: number
    location: string | null
    notes: string | null
    start_date: string
    end_date: string | null
    sports: { name: string } | null
    students: { profiles: { full_name: string } | null } | null
  }
  const rules = (recurrences ?? []) as unknown as RecurrenceRow[]
  if (rules.length === 0) return []

  const { data: exceptionsData } = await supabase
    .from('competition_recurrence_exceptions')
    .select('recurrence_id, date')
    .in(
      'recurrence_id',
      rules.map((r) => r.id),
    )

  const cancelledByRecurrence = new Map<string, Set<string>>()
  for (const e of (exceptionsData ?? []) as { recurrence_id: string; date: string }[]) {
    const set = cancelledByRecurrence.get(e.recurrence_id) ?? new Set<string>()
    set.add(e.date)
    cancelledByRecurrence.set(e.recurrence_id, set)
  }

  const { from, to } = recurrenceWindow()
  const occurrences: OccurrenceWithStudent[] = []
  for (const r of rules) {
    const dates = expandWeeklyRecurrence({ weekday: r.weekday, startDate: r.start_date, endDate: r.end_date }, from, to)
    const cancelled = cancelledByRecurrence.get(r.id)
    for (const date of dates) {
      if (cancelled?.has(date)) continue
      occurrences.push({
        id: `${r.id}:${date}`,
        recurrenceId: r.id,
        studentId: r.student_id,
        studentName: r.students?.profiles?.full_name ?? null,
        sportId: r.sport_id,
        sportName: r.sports?.name ?? null,
        date,
        time: null,
        type: r.type,
        importance: null,
        location: r.location,
        notes: r.notes,
      })
    }
  }
  return occurrences
}

/**
 * Calendario completo de un alumno para /alumno/calendario: competencias
 * puntuales + ocurrencias de sus series recurrentes, ordenado por fecha.
 */
export async function getStudentCalendarItems(studentId: string): Promise<Competition[]> {
  const supabase = await createClient()
  const [oneOff, occurrences] = await Promise.all([
    getStudentCompetitions(studentId),
    getRecurrenceOccurrences(supabase, studentId),
  ])
  return [...oneOff, ...occurrences].sort((a, b) => (a.date < b.date ? -1 : 1))
}

export type CalendarItem = Competition & {
  studentId: string
  studentName: string
}

/**
 * Todas las competencias/eventos (puntuales + ocurrencias de series
 * recurrentes) que el usuario logueado puede ver — RLS hace el recorte:
 * un profesor ve los de todos sus alumnos activos, un alumno (o
 * individuo autocoacheado) ve los suyos. Pensada para el calendario
 * agregado del profesor (`/calendario`).
 */
export async function getCalendarItems(): Promise<CalendarItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competitions')
    .select(
      'id, student_id, sport_id, date, time, type, importance, location, notes, sports(name), students(profiles(full_name))',
    )
    .order('date', { ascending: true })

  const rows = error || !data
    ? []
    : (data as unknown as (CompetitionRow & {
        student_id: string
        students: { profiles: { full_name: string } | null } | null
      })[])

  const oneOff: CalendarItem[] = rows.map((r) => ({
    ...toCompetition(r),
    studentId: r.student_id,
    studentName: r.students?.profiles?.full_name ?? 'Alumno',
  }))

  const occurrences = await getRecurrenceOccurrences(supabase)
  const recurring: CalendarItem[] = occurrences.map((o) => ({
    ...o,
    studentName: o.studentName ?? 'Alumno',
  }))

  return [...oneOff, ...recurring].sort((a, b) => (a.date < b.date ? -1 : 1))
}
