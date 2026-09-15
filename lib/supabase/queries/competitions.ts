import { createClient } from '@/lib/supabase/server'

export type Competition = {
  id: string
  sportId: string
  sportName: string
  date: string
  time: string | null
  type: 'partido' | 'carrera' | 'torneo' | 'campeonato' | 'competencia' | 'test' | 'evento'
  importance: string | null
  location: string | null
  notes: string | null
}

/** Competencias de un alumno (CLAUDE.md §27), más próximas primero. */
export async function getStudentCompetitions(studentId: string): Promise<Competition[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competitions')
    .select('id, sport_id, date, time, type, importance, location, notes, sports(name)')
    .eq('student_id', studentId)
    .order('date', { ascending: true })

  if (error || !data) return []

  const rows = data as unknown as {
    id: string
    sport_id: string
    date: string
    time: string | null
    type: Competition['type']
    importance: string | null
    location: string | null
    notes: string | null
    sports: { name: string } | null
  }[]

  return rows.map((r) => ({
    id: r.id,
    sportId: r.sport_id,
    sportName: r.sports?.name ?? 'Deporte',
    date: r.date,
    time: r.time,
    type: r.type,
    importance: r.importance,
    location: r.location,
    notes: r.notes,
  }))
}
