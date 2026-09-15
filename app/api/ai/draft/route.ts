import { NextResponse } from 'next/server'

import { runPlanDraftAssistant } from '@/lib/ai/run'
import { createClient } from '@/lib/supabase/server'
import { getCurrentPlanActor } from '@/lib/supabase/queries/professor-dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Genera un borrador de plan con IA (CLAUDE.md §33.4) para un alumno (el
 * profesor lo pide) o para uno mismo (el individuo autocoacheado). Guarda
 * el resultado en `plan_drafts` con status='pending' — nunca se aplica
 * solo, queda para que el profesor/individuo lo revise y apruebe o
 * rechace (ver app/planes/draft-actions.ts).
 */
export async function POST(req: Request) {
  const actor = await getCurrentPlanActor()
  if (!actor || actor.role === 'admin') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  let body: { studentId?: unknown; prompt?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
  const studentId = String(body.studentId ?? '')
  const prompt = String(body.prompt ?? '').trim().slice(0, 1000)
  if (!studentId) return NextResponse.json({ error: 'Falta el alumno.' }, { status: 400 })
  if (!prompt) return NextResponse.json({ error: 'Describí qué plan querés generar.' }, { status: 400 })

  const supabase = await createClient()

  if (actor.role === 'individual') {
    if (studentId !== actor.id) {
      return NextResponse.json({ error: 'Solo podés generar un borrador para vos mismo.' }, { status: 403 })
    }
  } else {
    const { data: rel } = await supabase
      .from('student_professors')
      .select('student_id')
      .eq('student_id', studentId)
      .eq('professor_id', actor.id)
      .maybeSingle()
    if (!rel) return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 })
  }

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
    const { data: sport } = await supabase.from('sports').select('name').eq('id', s.primary_sport_id).maybeSingle()
    sportName = sport?.name ?? null
  }

  const ctx = [
    actor.role === 'individual' ? null : `Alumno: ${s?.profiles?.full_name ?? 'sin nombre'}`,
    sportName ? `Deporte: ${sportName}` : null,
    s?.level ? `Nivel / experiencia: ${s.level}` : null,
    s?.availability ? `Disponibilidad: ${s.availability}` : null,
    s?.equipment_access ? `Equipamiento: ${s.equipment_access}` : null,
    s?.notes ? `Notas: ${s.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const fullPrompt = `${ctx || 'No hay datos adicionales cargados.'}\n\nPedido: ${prompt}`

  const res = await runPlanDraftAssistant({ supabase, professorId: actor.id, prompt: fullPrompt })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })

  const { data: draftRow, error } = await supabase
    .from('plan_drafts')
    .insert({
      student_id: studentId,
      payload: res.draft,
      source: 'ai',
      prompt,
      model: 'anthropic/claude-sonnet-4.5',
    })
    .select('id')
    .single()

  if (error || !draftRow) {
    return NextResponse.json({ error: error?.message ?? 'No se pudo guardar el borrador.' }, { status: 500 })
  }

  return NextResponse.json({ draftId: draftRow.id, draft: res.draft })
}
