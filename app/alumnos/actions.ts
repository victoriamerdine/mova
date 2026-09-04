'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { isValidUsername, normalizeUsername, usernameToSyntheticEmail } from '@/lib/auth/student-username'

export async function inviteStudent(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()

  if (!fullName || !email) {
    redirect('/alumnos?error=Falta el nombre o el email')
  }

  // Único uso legítimo de la service_role key en la app: invitar un
  // usuario nuevo es una operación de administración de Auth que no
  // existe en la API normal — ver lib/supabase/service-role.ts.
  const admin = createServiceRoleClient()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: 'student' },
  })

  if (inviteError || !invited.user) {
    redirect(`/alumnos?error=${encodeURIComponent(inviteError?.message ?? 'No se pudo invitar al alumno')}`)
  }

  // Esto sí corre con la sesión normal del profesor (RLS lo permite: la
  // política de student_professors ya exige professor_id = auth.uid()).
  const supabase = await createClient()
  const { error: relationError } = await supabase.from('student_professors').insert({
    student_id: invited.user!.id,
    professor_id: professor.id,
    is_primary: true,
    status: 'invited',
  })

  if (relationError) {
    redirect(`/alumnos?error=${encodeURIComponent(relationError.message)}`)
  }

  revalidatePath('/alumnos')
  redirect('/alumnos')
}

/**
 * Alta de alumno por usuario y contraseña, sin email — para alumnos que no
 * usan email habitualmente. El profesor elige la contraseña (o la genera
 * en el formulario) y se la pasa por WhatsApp; acá no queda guardada en
 * texto plano en ningún lado, solo se devuelve una vez a la UI que la
 * llamó para que la muestre y el profesor la comparta.
 *
 * A diferencia de `inviteStudent`, la cuenta queda utilizable de entrada
 * (status 'active', no 'invited') porque ya tiene contraseña real, no hay
 * nada pendiente de confirmar por email.
 */
export async function createStudentWithUsername(
  fullName: string,
  usernameRaw: string,
  password: string,
  phone: string | null,
): Promise<{ error: string | null }> {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const name = fullName.trim()
  const username = normalizeUsername(usernameRaw)

  if (!name) return { error: 'Falta el nombre del alumno.' }
  if (!isValidUsername(username)) {
    return { error: 'El usuario debe tener 3-24 caracteres: minúsculas, números, punto, guion o guion bajo.' }
  }
  if (password.length < 8) return { error: 'La contraseña necesita al menos 8 caracteres.' }

  // service_role: crear el usuario de Auth directamente (sin invitación por
  // email) es una operación de administración que no existe en la API
  // normal — ver el doc-comment de createServiceRoleClient.
  const admin = createServiceRoleClient()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: usernameToSyntheticEmail(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: 'student', username },
  })

  if (createError || !created.user) {
    const message = createError?.message.includes('already been registered')
      ? 'Ese usuario ya está en uso.'
      : (createError?.message ?? 'No se pudo crear el alumno.')
    return { error: message }
  }

  if (phone?.trim()) {
    // También con `admin`: la única policy RLS de `students` es "el alumno
    // edita su propia fila" — el profesor no puede escribir acá con el
    // cliente normal (ver doc-comment de createServiceRoleClient).
    await admin.from('students').update({ phone: phone.trim() }).eq('id', created.user.id)
  }

  // Esto sí corre con la sesión normal del profesor (RLS lo permite: la
  // política de student_professors ya exige professor_id = auth.uid()).
  const supabase = await createClient()
  const { error: relationError } = await supabase.from('student_professors').insert({
    student_id: created.user.id,
    professor_id: professor.id,
    is_primary: true,
    status: 'active',
  })

  if (relationError) return { error: relationError.message }

  revalidatePath('/alumnos')
  return { error: null }
}

export async function removeStudent(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const studentId = String(formData.get('studentId') ?? '')

  // Borra la RELACIÓN profesor↔alumno, no la cuenta del alumno — a
  // diferencia de Focus Entrena (donde "eliminar alumno" borra la rutina
  // entera sin vuelta atrás), acá el alumno podría tener otro profesor o
  // su propio historial, así que no se destruye su cuenta desde este botón.
  const supabase = await createClient()
  const { error } = await supabase
    .from('student_professors')
    .delete()
    .eq('student_id', studentId)
    .eq('professor_id', professor.id)

  if (error) {
    redirect(`/alumnos?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/alumnos')
}
