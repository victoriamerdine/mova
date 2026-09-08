import { NextResponse } from 'next/server'

import { RECOMMEND_SYSTEM } from '@/lib/ai/config'
import { runLibraryAssistant } from '@/lib/ai/run'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const professor = await getCurrentProfessor()
  if (!professor) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  let body: { studentId?: unknown; query?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
  const studentId = String(body.studentId ?? '')
  const query = String(body.query ?? '').trim().slice(0, 500)
  if (!studentId) return NextResponse.json({ error: 'Falta el alumno.' }, { status: 400 })

  const supabase = await createClient()

  // Autorización: la fila solo existe si este profesor gestiona al alumno.
  const { data: rel } = await supabase
    .from('student_professors')
    .select('student_id')
    .eq('student_id', studentId)
    .eq('professor_id', professor.id)
    .maybeSingle()
  if (!rel) return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 })

  const { data: st } = await supabase
    .from('students')
    .select('level, availability, equipment_access, notes, primary_sport_id, profiles(full_name)')
    .eq('id', studentId)
    .maybeSingle()

  const s = st as unknown as {
    level: string | null
    availability: string | null
    equipment_access: string | null
    notes: string | null
    primary_sport_id: string | null
    profiles: { full_name: string } | null
  } | null

  let sportName: string | null = null
  if (s?.primary_sport_id) {
    const { data: sport } = await supabase
      .from('sports')
      .select('name')
      .eq('id', s.primary_sport_id)
      .maybeSingle()
    sportName = sport?.name ?? null
  }

  const ctx = [
    `Alumno: ${s?.profiles?.full_name ?? 'sin nombre'}`,
    sportName ? `Deporte: ${sportName}` : null,
    s?.level ? `Nivel / experiencia: ${s.level}` : null,
    s?.availability ? `Disponibilidad: ${s.availability}` : null,
    s?.equipment_access ? `Equipamiento: ${s.equipment_access}` : null,
    s?.notes ? `Notas: ${s.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `${ctx || 'No hay datos cargados del alumno.'}\n\nPedido del profesor: ${
    query || 'Recomendá ejercicios apropiados para este alumno.'
  }`

  const res = await runLibraryAssistant({
    supabase,
    professorId: professor.id,
    fn: 'recommend',
    system: RECOMMEND_SYSTEM,
    prompt,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ answer: res.answer, exercises: res.exercises })
}
