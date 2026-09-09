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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function updateProfessor(
  professorId: string,
  input: {
    fullName: string
    email: string
    documentId: string
    phone: string
    address: string
  },
): Promise<Result> {
  await requireAdmin()

  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const documentId = input.documentId.trim()
  const phone = input.phone.trim()
  const address = input.address.trim()

  if (!fullName) return { error: 'El nombre no puede quedar vacío.' }
  if (!EMAIL_RE.test(email)) return { error: 'El email no es válido.' }

  const supabase = await createClient()
  const { data: prof } = await supabase
    .from('professors')
    .select('id')
    .eq('id', professorId)
    .maybeSingle()
  if (!prof) return { error: 'Profesor no encontrado.' }

  const service = createServiceRoleClient()
  const { data: current } = await service.auth.admin.getUserById(professorId)
  const currentEmail = current.user?.email?.toLowerCase() ?? null

  // Auth: email (único a nivel proyecto) + metadata sincronizada, en una llamada.
  const metadata = {
    ...(current.user?.user_metadata ?? {}),
    full_name: fullName,
    role: 'professor',
    document_id: documentId || null,
    phone: phone || null,
    address: address || null,
  }
  const emailChanged = email !== currentEmail

  // Chequeo de unicidad antes de tocar Auth: el error de colisión que
  // devuelve updateUserById es genérico ("Error updating user").
  if (emailChanged) {
    const { data: list } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const taken = list?.users.some(
      (u) => u.id !== professorId && u.email?.toLowerCase() === email,
    )
    if (taken) return { error: 'Ese email ya está en uso por otra cuenta.' }
  }

  const { error: authErr } = await service.auth.admin.updateUserById(professorId, {
    ...(emailChanged ? { email, email_confirm: true } : {}),
    user_metadata: metadata,
  })
  if (authErr) {
    const m = authErr.message.toLowerCase()
    if (m.includes('registered') || m.includes('already exists') || m.includes('duplicate')) {
      return { error: 'Ese email ya está en uso por otra cuenta.' }
    }
    return {
      error: emailChanged
        ? 'No se pudo cambiar el email (puede estar en uso por otra cuenta).'
        : authErr.message,
    }
  }

  // Datos de negocio.
  const { error: pErr } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', professorId)
  if (pErr) return { error: pErr.message }

  const { error: prErr } = await supabase
    .from('professors')
    .update({
      document_id: documentId || null,
      phone: phone || null,
      address: address || null,
    })
    .eq('id', professorId)
  if (prErr) return { error: prErr.message }

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
