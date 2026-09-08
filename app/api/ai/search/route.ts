import { generateText, stepCountIs } from 'ai'
import { NextResponse } from 'next/server'

import { AI_MAX_STEPS, AI_MODEL, AI_RATE_LIMIT_PER_HOUR, SEARCH_SYSTEM } from '@/lib/ai/config'
import { buildSearchTools, type ToolTrace } from '@/lib/ai/tools'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { getExercisesByIds } from '@/lib/supabase/queries/exercises'
import type { Database, Json } from '@/lib/supabase/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IDS_LINE = /\n?IDS:\s*([0-9a-f,\s-]*)\s*$/i

export async function POST(req: Request) {
  const professor = await getCurrentProfessor()
  if (!professor) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  let query = ''
  try {
    query = String(((await req.json()) as { query?: unknown }).query ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
  if (query.length < 3) return NextResponse.json({ error: 'Escribí una consulta.' }, { status: 400 })
  if (query.length > 500)
    return NextResponse.json({ error: 'La consulta es demasiado larga.' }, { status: 400 })

  const supabase = await createClient()

  // Rate limit por hora contra ai_interactions.
  const sinceHour = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await supabase
    .from('ai_interactions')
    .select('id', { count: 'exact', head: true })
    .eq('professor_id', professor.id)
    .gte('created_at', sinceHour)
  if ((count ?? 0) >= AI_RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: 'Alcanzaste el límite de consultas por hora. Probá de nuevo más tarde.' },
      { status: 429 },
    )
  }

  const trace: ToolTrace[] = []
  let text = ''
  let usage: { inputTokens?: number; outputTokens?: number } = {}
  try {
    const result = await generateText({
      model: AI_MODEL,
      system: SEARCH_SYSTEM,
      prompt: query,
      tools: buildSearchTools(trace),
      stopWhen: stepCountIs(AI_MAX_STEPS),
    })
    text = result.text
    usage = result.usage ?? {}
  } catch (err) {
    console.error('ai/search', err)
    return NextResponse.json(
      { error: 'La IA no está disponible en este momento. Probá de nuevo en un rato.' },
      { status: 502 },
    )
  }

  // La última línea "IDS: a,b,c" dice qué ejercicios citar. Se saca del texto
  // visible y se acota a ids que realmente pasaron por una tool (anti-invención).
  const surfaced = new Set(trace.flatMap((t) => t.resultIds))
  const idsMatch = text.match(IDS_LINE)
  const citedIds = (idsMatch?.[1] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && surfaced.has(s))
  const answer = text.replace(IDS_LINE, '').trim()

  const exercises = await getExercisesByIds(citedIds)

  const row: Database['public']['Tables']['ai_interactions']['Insert'] = {
    professor_id: professor.id,
    fn: 'search',
    prompt: query,
    model: AI_MODEL,
    tool_calls: trace.map((t) => ({ name: t.name, input: t.input })) as unknown as Json,
    result_ids: citedIds as unknown as Json,
    answer,
    input_tokens: usage.inputTokens ?? null,
    output_tokens: usage.outputTokens ?? null,
  }
  await supabase.from('ai_interactions').insert(row)

  return NextResponse.json({ answer, exercises })
}
