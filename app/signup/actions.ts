'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('fullName') ?? '')
  const role = String(formData.get('role') ?? 'individual')

  if (role !== 'professor' && role !== 'individual') {
    redirect('/signup?error=Rol inválido')
  }

  // Datos personales del profesor — obligatorios para el alta.
  const documentId = String(formData.get('documentId') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  if (role === 'professor' && (!documentId || !phone || !address)) {
    redirect('/signup?error=' + encodeURIComponent('Completá documento, teléfono y dirección.'))
  }

  const supabase = await createClient()

  // profiles/professors/students se crean solos vía trigger
  // (public.handle_new_user, supabase/migrations/20260828000011...) a
  // partir de este mismo options.data — no hace falta ni conviene
  // insertarlos acá: si el proyecto pide confirmar el email, todavía no
  // hay sesión en este punto y un INSERT desde la app correría como
  // `anon`, bloqueado por RLS.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data:
        role === 'professor'
          ? { full_name: fullName, role, document_id: documentId, phone, address }
          : { full_name: fullName, role },
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect(
    role === 'professor'
      ? '/login?message=' +
          encodeURIComponent(
            'Tu cuenta quedó pendiente de aprobación de un administrador. Te avisamos cuando esté lista.',
          )
      : '/login?message=Revisá tu email para confirmar la cuenta (si hace falta) y después iniciá sesión',
  )
}
