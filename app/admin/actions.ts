'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getCurrentAdmin } from '@/lib/supabase/queries/admin'

type Result = { error?: string }

async function requireAdmin() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  return admin
}

export async function setProfessorStatus(
  professorId: string,
  status: 'pending' | 'active' | 'suspended',
): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('professors')
    .update({ status })
    .eq('id', professorId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function promoteToAdmin(userId: string): Promise<Result> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function resetProfessorPassword(
  professorId: string,
  newPassword: string,
): Promise<Result> {
  await requireAdmin()
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return { error: 'La contraseña necesita al menos 8 caracteres.' }
  }
  // Chequeo de que sea realmente un profesor.
  const supabase = await createClient()
  const { data: prof } = await supabase
    .from('professors')
    .select('id')
    .eq('id', professorId)
    .maybeSingle()
  if (!prof) return { error: 'Profesor no encontrado.' }

  const admin = createServiceRoleClient()
  const { error } = await admin.auth.admin.updateUserById(professorId, { password: newPassword })
  if (error) return { error: error.message }
  return {}
}

export async function createProfessorAccount(input: {
  fullName: string
  email: string
  documentId: string
  phone: string
  address: string
  password: string
}): Promise<Result> {
  await requireAdmin()
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  if (!fullName || !email) return { error: 'Falta el nombre o el email.' }
  if (input.password.length < 8) return { error: 'La contraseña necesita al menos 8 caracteres.' }

  const admin = createServiceRoleClient()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'professor',
      document_id: input.documentId.trim() || null,
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
    },
  })
  if (createErr || !created.user) {
    const msg = createErr?.message.includes('already been registered')
      ? 'Ese email ya está registrado.'
      : (createErr?.message ?? 'No se pudo crear el profesor.')
    return { error: msg }
  }

  // El trigger lo deja 'pending'; como lo crea el admin, se aprueba directo.
  const supabase = await createClient()
  await supabase.from('professors').update({ status: 'active' }).eq('id', created.user.id)

  revalidatePath('/admin')
  return {}
}
