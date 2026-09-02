'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'

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
