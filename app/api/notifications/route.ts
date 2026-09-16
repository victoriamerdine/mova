import { NextResponse } from 'next/server'

import { getCurrentProfessor, getProfessorNotifications } from '@/lib/supabase/queries/professor-dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Alumnos con novedades (sesión completada nueva) para la campanita del profesor. */
export async function GET() {
  const professor = await getCurrentProfessor()
  if (!professor) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const notifications = await getProfessorNotifications(professor.id)
  return NextResponse.json({ notifications })
}
