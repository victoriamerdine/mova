import { NextResponse } from 'next/server'

import {
  getCurrentProfessor,
  getProfessorNotifications,
  getScheduleNotifications,
} from '@/lib/supabase/queries/professor-dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Alumnos con novedades (sesión completada nueva, o días de entreno cambiados) para la campanita del profesor. */
export async function GET() {
  const professor = await getCurrentProfessor()
  if (!professor) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const [progress, schedule] = await Promise.all([
    getProfessorNotifications(professor.id),
    getScheduleNotifications(professor.id),
  ])
  const notifications = [...progress, ...schedule].sort((a, b) =>
    a.latestAt < b.latestAt ? 1 : -1,
  )
  return NextResponse.json({ notifications })
}
