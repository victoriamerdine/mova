import { NextResponse } from 'next/server'

import { SEARCH_SYSTEM } from '@/lib/ai/config'
import { runLibraryAssistant } from '@/lib/ai/run'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
  const res = await runLibraryAssistant({
    supabase,
    professorId: professor.id,
    fn: 'search',
    system: SEARCH_SYSTEM,
    prompt: query,
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ answer: res.answer, exercises: res.exercises })
}
