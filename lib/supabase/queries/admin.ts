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

  // Conteos (el admin tiene policy de lectura sobre student_professors y plans).
  const [{ data: rels }, { data: plans }] = await Promise.all([
    supabase.from('student_professors').select('professor_id').in('professor_id', ids),
    supabase.from('plans').select('professor_id').in('professor_id', ids),
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
    createdAt: p.created_at,
  }))
}
