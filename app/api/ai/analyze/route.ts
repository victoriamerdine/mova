import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { AI_ANALYZE_MODEL, AI_RATE_LIMIT_PER_HOUR, ANALYZE_SYSTEM } from '@/lib/ai/config'
import { weekAlerts, type WeekGroup, type WeekTarget } from '@/lib/analytics/week-alerts'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import type { Database, Json } from '@/lib/supabase/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  planId?: unknown
  weekLabel?: unknown
  sessions?: unknown
  weekly?: unknown
  targets?: unknown
  byDay?: unknown
}

function asGroups(v: unknown): WeekGroup[] {
  if (!Array.isArray(v)) return []
  return v
    .map((g) => ({
      group: String((g as WeekGroup)?.group ?? '').trim(),
      series: Number((g as WeekGroup)?.series) || 0,
      intensityAvg:
        (g as WeekGroup)?.intensityAvg == null ? null : Number((g as WeekGroup).intensityAvg),
    }))
    .filter((g) => g.group)
}

export async function POST(req: Request) {
  const professor = await getCurrentProfessor()
  if (!professor) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const planId = String(body.planId ?? '')
  const weekLabel = String(body.weekLabel ?? 'la semana').slice(0, 80)
  const sessions = Math.max(0, Math.round(Number(body.sessions) || 0))
  const weekly = asGroups(body.weekly)
  const targets: WeekTarget[] = Array.isArray(body.targets)
    ? (body.targets as WeekTarget[])
        .map((t) => ({
          group: String(t?.group ?? '').trim(),
          weeklySeries: t?.weeklySeries == null ? null : Number(t.weeklySeries),
          intensity: t?.intensity == null ? null : Number(t.intensity),
        }))
        .filter((t) => t.group)
    : []
  const byDay = Array.isArray(body.byDay)
    ? (body.byDay as { name: string; groups: WeekGroup[] }[]).slice(0, 14).map((d) => ({
        name: String(d?.name ?? '').slice(0, 60),
        groups: asGroups(d?.groups),
      }))
    : []

  if (!planId) return NextResponse.json({ error: 'Falta el plan.' }, { status: 400 })

  const supabase = await createClient()

  // RLS: la fila vuelve solo si el profesor gestiona a ese alumno.
  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, student_id')
    .eq('id', planId)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado.' }, { status: 404 })

  const sinceHour = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await supabase
    .from('ai_interactions')
    .select('id', { count: 'exact', head: true })
    .eq('professor_id', professor.id)
    .gte('created_at', sinceHour)
  if ((count ?? 0) >= AI_RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: 'Alcanzaste el límite de consultas por hora. Probá más tarde.' },
      { status: 429 },
    )
  }

  const alerts = weekAlerts(weekly, targets, sessions)

  if (weekly.every((g) => g.series === 0)) {
    return NextResponse.json({
      answer: 'Todavía no hay volumen cargado en esta semana. Cargá ejercicios con series para poder analizarla.',
      alerts: [],
    })
  }

  const dataBlock = [
    `Semana: ${weekLabel}`,
    `Sesiones con contenido: ${sessions}`,
    '',
    'Volumen por grupo (series | RPE promedio):',
    ...weekly
      .filter((g) => g.series > 0)
      .sort((a, b) => b.series - a.series)
      .map((g) => `  ${g.group}: ${g.series}${g.intensityAvg != null ? ` | RPE ${g.intensityAvg}` : ''}`),
    '',
    targets.length
      ? `Objetivos de carga del alumno:\n${targets
          .map((t) => `  ${t.group}: ${t.weeklySeries ?? '—'} series${t.intensity != null ? `, RPE ${t.intensity}` : ''}`)
          .join('\n')}`
      : 'El alumno no tiene objetivos de carga configurados.',
    '',
    byDay.length
      ? `Por día:\n${byDay
          .map(
            (d) =>
              `  ${d.name}: ${d.groups
                .filter((g) => g.series > 0)
                .map((g) => `${g.group} ${g.series}`)
                .join(', ') || 'sin volumen'}`,
          )
          .join('\n')}`
      : '',
    '',
    alerts.length
      ? `Señales calculadas por el sistema:\n${alerts.map((a) => `  [${a.level}] ${a.text}`).join('\n')}`
      : 'El sistema no detectó señales particulares.',
  ]
    .filter((l) => l !== '')
    .join('\n')

  let answer = ''
  let usage: { inputTokens?: number; outputTokens?: number } = {}
  try {
    const result = await generateText({
      model: AI_ANALYZE_MODEL,
      system: ANALYZE_SYSTEM,
      prompt: `Analizá la distribución de esta semana:\n\n${dataBlock}`,
    })
    answer = result.text.trim()
    usage = result.usage ?? {}
  } catch (err) {
    console.error('ai/analyze', err)
    return NextResponse.json(
      { error: 'La IA no está disponible en este momento. Probá de nuevo en un rato.' },
      { status: 502 },
    )
  }

  const row: Database['public']['Tables']['ai_interactions']['Insert'] = {
    professor_id: professor.id,
    fn: 'analyze',
    prompt: `[plan ${plan.name} / ${weekLabel}] ${dataBlock}`.slice(0, 4000),
    model: AI_ANALYZE_MODEL,
    tool_calls: [] as unknown as Json,
    result_ids: [] as unknown as Json,
    answer,
    input_tokens: usage.inputTokens ?? null,
    output_tokens: usage.outputTokens ?? null,
  }
  await supabase.from('ai_interactions').insert(row)

  return NextResponse.json({ answer, alerts })
}
