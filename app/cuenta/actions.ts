'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'

type Result = { error?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireProfessor() {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')
  return professor
}

/** El profesor edita sus propios datos. Nombre y datos personales van por
 *  RLS (edita su propia fila); el email cambia al instante vía Auth admin
 *  sobre su MISMO id (mismo criterio que el flujo del admin: sin mail de
 *  confirmación). */
export async function updateMyProfile(input: {
  fullName: string
  email: string
  documentId: string
  phone: string
  address: string
}): Promise<Result> {
  const me = await requireProfessor()

  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const documentId = input.documentId.trim()
  const phone = input.phone.trim()
  const address = input.address.trim()

  if (!fullName) return { error: 'El nombre no puede quedar vacío.' }
  if (!EMAIL_RE.test(email)) return { error: 'El email no es válido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const currentEmail = user?.email?.toLowerCase() ?? null
  const emailChanged = email !== currentEmail

  if (emailChanged) {
    const service = createServiceRoleClient()
    const { data: list } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const taken = list?.users.some((u) => u.id !== me.id && u.email?.toLowerCase() === email)
    if (taken) return { error: 'Ese email ya está en uso por otra cuenta.' }

    const { error: authErr } = await service.auth.admin.updateUserById(me.id, {
      email,
      email_confirm: true,
      user_metadata: { ...(user?.user_metadata ?? {}), email, full_name: fullName },
    })
    if (authErr) {
      return { error: 'No se pudo cambiar el email (puede estar en uso por otra cuenta).' }
    }
  } else {
    // Mantener el nombre en metadata sincronizado sin tocar Auth admin.
    await supabase.auth.updateUser({ data: { full_name: fullName } })
  }

  const { error: pErr } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', me.id)
  if (pErr) return { error: pErr.message }

  const { error: prErr } = await supabase
    .from('professors')
    .update({
      document_id: documentId || null,
      phone: phone || null,
      address: address || null,
    })
    .eq('id', me.id)
  if (prErr) return { error: prErr.message }

  revalidatePath('/cuenta')
  revalidatePath('/')
  return {}
}

export async function updateMyPassword(newPassword: string): Promise<Result> {
  await requireProfessor()
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return { error: 'La contraseña necesita al menos 8 caracteres.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return {}
}
