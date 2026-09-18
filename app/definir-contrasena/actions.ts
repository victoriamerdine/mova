'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Cierra la invitación de un alumno: pasa su relación con el profesor de
 * `invited` a `active`. Hasta acá `is_professor_of()` (que exige 'active')
 * no le dejaba al profesor ver ni armarle nada. La policy de
 * student_professors solo deja actualizar al profesor, por eso va con
 * service role — pero acotado al id de la sesión ya verificada y a las
 * filas todavía `invited`, así que no da acceso a nada que ese usuario no
 * tuviera de todas formas al aceptar la invitación.
 */
export async function activateInvitation(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión venció. Abrí de nuevo el link de la invitación.' }

  const service = createServiceRoleClient()
  const { error } = await service
    .from('student_professors')
    .update({ status: 'active' })
    .eq('student_id', user.id)
    .eq('status', 'invited')
  if (error) return { error: 'No se pudo activar tu cuenta. Avisale a tu profesor.' }
  return {}
}
