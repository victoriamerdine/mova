import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Descarga de un archivo respuesta: redirige a una signed URL de corta
 * duración. La autorización es explícita acá — con el cliente normal
 * (RLS) se verifica que el profesor logueado sea dueño de la submission y
 * que el path pertenezca a esa submission; recién entonces se firma la
 * URL con la service_role key (el bucket es privado y no hay policy de
 * lectura para usuarios).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  const { id, submissionId } = await params
  const path = new URL(req.url).searchParams.get('path') ?? ''

  if (!path.startsWith(`${submissionId}/`) || path.includes('..')) {
    return NextResponse.json({ error: 'Ruta inválida.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  // RLS de form_submissions: solo devuelve la fila si es del profesor.
  const { data: submission } = await supabase
    .from('form_submissions')
    .select('id')
    .eq('id', submissionId)
    .eq('form_id', id)
    .maybeSingle()
  if (!submission) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  const { data, error } = await createServiceRoleClient()
    .storage.from('form-uploads')
    .createSignedUrl(path, 120)
  if (error || !data) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  return NextResponse.redirect(data.signedUrl)
}
