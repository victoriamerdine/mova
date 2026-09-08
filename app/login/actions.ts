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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // Redirigir según el rol. El profesor no aprobado va a /pendiente
  // (si fuera a "/" caería en un loop: getCurrentProfessor lo rechaza).
  const role = (data.user?.user_metadata as { role?: string } | undefined)?.role
  if (role === 'admin') redirect('/admin')
  if (role === 'student') redirect('/alumno')
  if (role === 'professor') {
    const { data: prof } = await supabase
      .from('professors')
      .select('status')
      .eq('id', data.user!.id)
      .maybeSingle()
    redirect(prof?.status === 'active' ? '/' : '/pendiente')
  }
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
