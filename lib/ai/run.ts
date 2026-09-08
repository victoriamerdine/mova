import { generateText, stepCountIs } from 'ai'

import { AI_MAX_STEPS, AI_MODEL, AI_RATE_LIMIT_PER_HOUR } from '@/lib/ai/config'
import { buildSearchTools, type ToolTrace } from '@/lib/ai/tools'
import type { createClient } from '@/lib/supabase/server'
import { getExercisesByIds } from '@/lib/supabase/queries/exercises'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { LibraryItem } from '@/lib/library'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>
type Fn = Database['public']['Tables']['ai_interactions']['Row']['fn']

// Última línea que menciona "IDS" (tolera markdown: **IDS:**, - IDS: …).
const IDS_LINE = /\n?[^\n]*\bIDS\b[^\n]*$/i
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

export type AssistantResult =
  | { ok: true; answer: string; exercises: LibraryItem[] }
  | { ok: false; status: number; error: string }

/**
 * Corre el asistente de biblioteca (Buscar / Recomendar): rate limit,
 * tool-use contra la biblioteca real, recorte de la línea "IDS:" a ids que
 * de verdad pasaron por una tool, y log en ai_interactions. Lo comparten
 * los routes /api/ai/search y /api/ai/recommend.
 */
export async function runLibraryAssistant(opts: {
  supabase: SupabaseServer
  professorId: string
  fn: Fn
  system: string
  prompt: string
}): Promise<AssistantResult> {
  const { supabase, professorId, fn, system, prompt } = opts

  const sinceHour = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await supabase
    .from('ai_interactions')
    .select('id', { count: 'exact', head: true })
    .eq('professor_id', professorId)
    .gte('created_at', sinceHour)
  if ((count ?? 0) >= AI_RATE_LIMIT_PER_HOUR) {
    return {
      ok: false,
      status: 429,
      error: 'Alcanzaste el límite de consultas por hora. Probá de nuevo más tarde.',
    }
  }

  const trace: ToolTrace[] = []
  let text = ''
  let usage: { inputTokens?: number; outputTokens?: number } = {}
  let finishReason = 'stop'
  try {
    const result = await generateText({
      model: AI_MODEL,
      system,
      prompt,
      tools: buildSearchTools(trace),
      stopWhen: stepCountIs(AI_MAX_STEPS),
    })
    text = result.text
    usage = result.usage ?? {}
    finishReason = result.finishReason
  } catch (err) {
    console.error(`ai/${fn}`, err)
    return {
      ok: false,
      status: 502,
      error: 'La IA no está disponible en este momento. Probá de nuevo en un rato.',
    }
  }

  // Se cortó a mitad del loop de tools (llegó al tope de pasos): lo que hay
  // en `text` es un fragmento intermedio, no una respuesta.
  if (finishReason === 'tool-calls' || text.trim() === '') {
    return {
      ok: false,
      status: 503,
      error: 'La consulta era muy amplia y no llegué a terminar. Probá acotarla un poco.',
    }
  }

  const surfaced = new Set(trace.flatMap((t) => t.resultIds))
  const idsLine = text.match(IDS_LINE)
  const citedIds = [...(idsLine?.[0].match(UUID_RE) ?? [])]
    .map((s) => s.toLowerCase())
    .filter((s) => surfaced.has(s))
  const answer = (idsLine?.index != null ? text.slice(0, idsLine.index) : text).trim()
  const exercises = await getExercisesByIds(citedIds)

  const row: Database['public']['Tables']['ai_interactions']['Insert'] = {
    professor_id: professorId,
    fn,
    prompt,
    model: AI_MODEL,
    tool_calls: trace.map((t) => ({ name: t.name, input: t.input })) as unknown as Json,
    result_ids: citedIds as unknown as Json,
    answer,
    input_tokens: usage.inputTokens ?? null,
    output_tokens: usage.outputTokens ?? null,
  }
  await supabase.from('ai_interactions').insert(row)

  return { ok: true, answer, exercises }
}
