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
    options: { data: { full_name: fullName, role } },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/login?message=Revisá tu email para confirmar la cuenta (si hace falta) y después iniciá sesión')
}
