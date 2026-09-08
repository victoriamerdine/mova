import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { FormStructure } from '@/lib/forms/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HARD_CAP_BYTES = 15 * 1024 * 1024

type FileValue = { path: string; filename: string; size: number; mime: string }

/**
 * Subida de un archivo respuesta. El alumno NO está logueado: la única
 * credencial es el token de la submission, que se valida acá. Se usa la
 * service_role key porque no hay auth.uid() para policies de Storage
 * (mismo criterio que el alta de alumnos en app/alumnos/actions.ts).
 *
 * No escribe en form_answers: devuelve { path, filename, size, mime } y el
 * cliente lo setea como valor de la respuesta; el autosave lo persiste.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 })
  }

  const file = form.get('file')
  const questionId = String(form.get('questionId') ?? '')
  if (!(file instanceof File) || !questionId) {
    return NextResponse.json({ error: 'Falta el archivo o la pregunta.' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 })
  }
  if (file.size > HARD_CAP_BYTES) {
    return NextResponse.json({ error: 'El archivo supera los 15 MB.' }, { status: 413 })
  }

  const supabase = createServiceRoleClient()

  const { data: submission } = await supabase
    .from('form_submissions')
    .select('id, status, form_version_id')
    .eq('token', token)
    .maybeSingle()

  if (!submission) {
    return NextResponse.json({ error: 'Formulario no encontrado.' }, { status: 404 })
  }
  if (submission.status === 'completed' || submission.status === 'expired') {
    return NextResponse.json({ error: 'Este formulario ya no admite cambios.' }, { status: 409 })
  }

  const { data: version } = await supabase
    .from('form_versions')
    .select('structure')
    .eq('id', submission.form_version_id)
    .maybeSingle()

  const structure = version?.structure as unknown as FormStructure | undefined
  const question = structure?.sections
    .flatMap((s) => s.questions)
    .find((q) => q.id === questionId)

  if (!question || question.type !== 'file') {
    return NextResponse.json({ error: 'Pregunta inválida.' }, { status: 400 })
  }

  const maxMb = Number(question.config?.maxSizeMB) || 10
  const maxBytes = Math.min(maxMb * 1024 * 1024, HARD_CAP_BYTES)
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `El archivo supera el límite de ${maxMb} MB.` },
      { status: 413 },
    )
  }

  const accept = (question.config?.accept ?? '').trim()
  if (accept && !mimeAccepted(accept, file.type, file.name)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido.' }, { status: 415 })
  }

  const ext = extOf(file.name) || extFromMime(file.type) || 'bin'
  const path = `${submission.id}/${questionId}/${randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('form-uploads')
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 502 })
  }

  const value: FileValue = {
    path,
    filename: file.name.slice(0, 200),
    size: file.size,
    mime: file.type || 'application/octet-stream',
  }
  return NextResponse.json({ value })
}

function extOf(name: string): string | null {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name)
  return m ? m[1].toLowerCase() : null
}

function extFromMime(mime: string): string | null {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'application/pdf': 'pdf',
  }
  return map[mime] ?? null
}

/** accept: lista separada por comas de "image/*", "application/pdf", ".pdf" */
function mimeAccepted(accept: string, mime: string, name: string): boolean {
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const lowerName = name.toLowerCase()
  return tokens.some((t) => {
    if (t.startsWith('.')) return lowerName.endsWith(t)
    if (t.endsWith('/*')) return mime.startsWith(t.slice(0, -1))
    return mime === t
  })
}
