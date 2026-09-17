import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type CurrentAdmin = { id: string; fullName: string }

/** null si no hay sesión o el usuario logueado no es admin. */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') return null
  return { id: profile.id, fullName: profile.full_name }
}

export type AdminProfessor = {
  id: string
  fullName: string
  email: string | null
  documentId: string | null
  phone: string | null
  address: string | null
  status: 'pending' | 'active' | 'suspended'
  studentCount: number
  planCount: number
  formCount: number
  createdAt: string
}

export async function getAdminProfessors(): Promise<AdminProfessor[]> {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('professors')
    .select('id, status, document_id, phone, address, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })

  const list = (rows ?? []) as unknown as {
    id: string
    status: AdminProfessor['status']
    document_id: string | null
    phone: string | null
    address: string | null
    created_at: string
    profiles: { full_name: string } | null
  }[]
  if (list.length === 0) return []

  const ids = list.map((p) => p.id)

  // Conteos (el admin tiene policy de lectura sobre student_professors, plans y forms).
  const [{ data: rels }, { data: plans }, { data: forms }] = await Promise.all([
    supabase.from('student_professors').select('professor_id').in('professor_id', ids),
    supabase.from('plans').select('professor_id').in('professor_id', ids),
    supabase.from('forms').select('professor_id').in('professor_id', ids),
  ])
  const countBy = (arr: { professor_id: string | null }[] | null) => {
    const m = new Map<string, number>()
    for (const r of arr ?? []) {
      if (r.professor_id) m.set(r.professor_id, (m.get(r.professor_id) ?? 0) + 1)
    }
    return m
  }
  const studentCounts = countBy(rels)
  const planCounts = countBy(plans)
  const formCounts = countBy(forms)

  // Emails desde Auth (no están en profiles) — service role.
  const admin = createServiceRoleClient()
  const emails = new Map<string, string | null>()
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      emails.set(id, data.user?.email ?? null)
    }),
  )

  return list.map((p) => ({
    id: p.id,
    fullName: p.profiles?.full_name ?? 'Profesor',
    email: emails.get(p.id) ?? null,
    documentId: p.document_id,
    phone: p.phone,
    address: p.address,
    status: p.status,
    studentCount: studentCounts.get(p.id) ?? 0,
    planCount: planCounts.get(p.id) ?? 0,
    formCount: formCounts.get(p.id) ?? 0,
    createdAt: p.created_at,
  }))
}

const AR_TZ = 'America/Argentina/Buenos_Aires'
const arHourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: AR_TZ,
  hour: 'numeric',
  hour12: false,
})

/** Hora local (0-23, huso de Argentina) de un timestamp — para "horas de mayor tráfico". */
function arHour(iso: string): number {
  const h = Number(arHourFormatter.format(new Date(iso)))
  return h === 24 ? 0 : h
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

export type AdminAnalytics = {
  professors: {
    total: number
    active: number
    pending: number
    suspended: number
    newLast7d: number
    newLast30d: number
  }
  students: {
    managed: number
    individual: number
    total: number
    newLast7d: number
    newLast30d: number
  }
  plans: {
    total: number
    active: number
    completed: number
    draft: number
    archived: number
    byType: { type: string; count: number }[]
    newLast7d: number
    newLast30d: number
  }
  sports: {
    totalActive: number
    topByPlans: { name: string; count: number }[]
  }
  exercises: { total: number }
  forms: { total: number; completedSubmissions: number }
  sessions: {
    total: number
    last7d: number
    last30d: number
    byHourAR: number[]
    peakHourAR: number | null
  }
}

/**
 * Métricas agregadas para el panel de Analítica del admin (CLAUDE.md
 * §41-44 "entender comportamientos" + discurso comercial). Todo en
 * memoria sobre selects livianos — no hay volumen todavía que justifique
 * SQL agregado en el servidor. "Horas de mayor tráfico" usa el huso de
 * Argentina (mercado del producto), no UTC ni el del navegador del admin
 * — agregado entre MUCHOS usuarios, no tiene sentido "la hora local de
 * cada uno" como sí la tiene `localDateKey` para un alumno individual.
 */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const supabase = await createClient()
  const since7d = daysAgo(7)
  const since30d = daysAgo(30)

  const [
    professorsRes,
    profilesRes,
    plansRes,
    sportsActiveRes,
    exercisesRes,
    formsRes,
    submissionsRes,
    sessionsRes,
  ] = await Promise.all([
    supabase.from('professors').select('status, created_at'),
    supabase.from('profiles').select('role, created_at').in('role', ['student', 'individual']),
    supabase.from('plans').select('status, plan_type, sport_id, created_at, sports(name)'),
    supabase.from('sports').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('exercises').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('forms').select('id', { count: 'exact', head: true }).eq('is_template', false),
    supabase.from('form_submissions').select('status', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('workout_sessions').select('completed_at').not('completed_at', 'is', null).limit(10000),
  ])

  const professors = (professorsRes.data ?? []) as { status: string; created_at: string }[]
  const profiles = (profilesRes.data ?? []) as { role: 'student' | 'individual'; created_at: string }[]
  const plans = (plansRes.data ?? []) as unknown as {
    status: string
    plan_type: string
    sport_id: string | null
    created_at: string
    sports: { name: string } | null
  }[]
  const sessions = (sessionsRes.data ?? []) as { completed_at: string }[]

  const byHourAR = Array.from({ length: 24 }, () => 0)
  for (const s of sessions) byHourAR[arHour(s.completed_at)]++
  const peakHourAR = sessions.length === 0 ? null : byHourAR.indexOf(Math.max(...byHourAR))

  const sportCounts = new Map<string, number>()
  for (const p of plans) {
    if (!p.sport_id || !p.sports?.name) continue
    sportCounts.set(p.sports.name, (sportCounts.get(p.sports.name) ?? 0) + 1)
  }
  const topByPlans = [...sportCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const planTypeCounts = new Map<string, number>()
  for (const p of plans) planTypeCounts.set(p.plan_type, (planTypeCounts.get(p.plan_type) ?? 0) + 1)

  return {
    professors: {
      total: professors.length,
      active: professors.filter((p) => p.status === 'active').length,
      pending: professors.filter((p) => p.status === 'pending').length,
      suspended: professors.filter((p) => p.status === 'suspended').length,
      newLast7d: professors.filter((p) => p.created_at >= since7d).length,
      newLast30d: professors.filter((p) => p.created_at >= since30d).length,
    },
    students: {
      managed: profiles.filter((p) => p.role === 'student').length,
      individual: profiles.filter((p) => p.role === 'individual').length,
      total: profiles.length,
      newLast7d: profiles.filter((p) => p.created_at >= since7d).length,
      newLast30d: profiles.filter((p) => p.created_at >= since30d).length,
    },
    plans: {
      total: plans.length,
      active: plans.filter((p) => p.status === 'active').length,
      completed: plans.filter((p) => p.status === 'completed').length,
      draft: plans.filter((p) => p.status === 'draft').length,
      archived: plans.filter((p) => p.status === 'archived').length,
      byType: [...planTypeCounts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      newLast7d: plans.filter((p) => p.created_at >= since7d).length,
      newLast30d: plans.filter((p) => p.created_at >= since30d).length,
    },
    sports: {
      totalActive: sportsActiveRes.count ?? 0,
      topByPlans,
    },
    exercises: { total: exercisesRes.count ?? 0 },
    forms: { total: formsRes.count ?? 0, completedSubmissions: submissionsRes.count ?? 0 },
    sessions: {
      total: sessions.length,
      last7d: sessions.filter((s) => s.completed_at >= since7d).length,
      last30d: sessions.filter((s) => s.completed_at >= since30d).length,
      byHourAR,
      peakHourAR,
    },
  }
}

export type AdminIndividualPlan = { id: string; name: string; status: string }

export type AdminIndividual = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  createdAt: string
  plans: AdminIndividualPlan[]
}

/**
 * Alumnos independientes (profiles.role='individual', arman su propio
 * plan sin profesor — 20260828000008). Requiere las policies de admin de
 * 20260828000040 (students, plans).
 */
export async function getIndependentStudents(): Promise<AdminIndividual[]> {
  const supabase = await createClient()

  const { data: individuals } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'individual')
  const profileById = new Map((individuals ?? []).map((p) => [p.id, p.full_name]))
  if (profileById.size === 0) return []

  const ids = [...profileById.keys()]

  const { data: rows } = await supabase
    .from('students')
    .select('id, status, phone, created_at')
    .in('id', ids)
    .order('created_at', { ascending: false })

  const list = (rows ?? []) as unknown as {
    id: string
    status: AdminIndividual['status']
    phone: string | null
    created_at: string
  }[]
  if (list.length === 0) return []

  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, status, student_id')
    .in('student_id', ids)
    .is('professor_id', null)

  const plansByStudent = new Map<string, AdminIndividualPlan[]>()
  for (const p of plans ?? []) {
    const arr = plansByStudent.get(p.student_id) ?? []
    arr.push({ id: p.id, name: p.name, status: p.status })
    plansByStudent.set(p.student_id, arr)
  }

  const admin = createServiceRoleClient()
  const emails = new Map<string, string | null>()
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      emails.set(id, data.user?.email ?? null)
    }),
  )

  return list.map((s) => ({
    id: s.id,
    fullName: profileById.get(s.id) ?? 'Alumno',
    email: emails.get(s.id) ?? null,
    phone: s.phone,
    status: s.status,
    createdAt: s.created_at,
    plans: plansByStudent.get(s.id) ?? [],
  }))
}
