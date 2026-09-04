'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { normalizeUsername, usernameToSyntheticEmail } from '@/lib/auth/student-username'

export async function login(formData: FormData) {
  const identifier = String(formData.get('identifier') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  // Alumnos creados por usuario/contraseña (sin email) inician sesión con
  // su username — se reconstruye el mismo email sintético que se generó al
  // crearlos (ver lib/auth/student-username.ts). Cualquier otra cuenta usa
  // su email real de siempre.
  const email = identifier.includes('@') ? identifier : usernameToSyntheticEmail(normalizeUsername(identifier))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
