import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { STUDENT_USERNAME_DOMAIN } from '@/lib/auth/student-username'

/**
 * Usuario de login del alumno (para mostrárselo al profesor). Vive en
 * Auth (`user_metadata.username`, o la parte local del email sintético),
 * no en una tabla de negocio — por eso va con la service_role key, igual
 * que el alta de alumnos. Devuelve null si el alumno entra con un email
 * real en vez de usuario.
 */
export async function getStudentUsername(studentId: string): Promise<string | null> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin.auth.admin.getUserById(studentId)
  if (error || !data.user) return null

  const meta = (data.user.user_metadata ?? {}) as { username?: unknown }
  if (typeof meta.username === 'string' && meta.username) return meta.username

  const email = data.user.email ?? ''
  if (email.endsWith(`@${STUDENT_USERNAME_DOMAIN}`)) return email.split('@')[0]
  return null
}
