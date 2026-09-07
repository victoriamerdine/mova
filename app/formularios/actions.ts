'use server'

import { randomBytes } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'

type Result<T = Record<string, never>> = ({ error?: undefined } & T) | { error: string }

async function requireProfessor() {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')
  return professor
}

// ============================================================
// Formulario — alta / metadatos / estado
// ============================================================
export async function createForm(name: string): Promise<Result<{ id: string }>> {
  const professor = await requireProfessor()
  const trimmed = name.trim()
  if (!trimmed) return { error: 'El formulario necesita un nombre.' }

  const supabase = await createClient()
  const { data: form, error } = await supabase
    .from('forms')
    .insert({ professor_id: professor.id, name: trimmed, status: 'draft', is_template: false })
    .select('id')
    .single()
  if (error || !form) return { error: error?.message ?? 'No se pudo crear el formulario.' }

  // Toda forma arranca con una sección por defecto.
  await supabase.from('form_sections').insert({ form_id: form.id, order: 0, title: 'General' })

  revalidatePath('/formularios')
  return { id: form.id }
}

export async function createFormFromTemplate(templateId: string): Promise<Result<{ id: string }>> {
  await requireProfessor()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_form_from_template', {
    p_template_id: templateId,
  })
  if (error || !data) return { error: error?.message ?? 'No se pudo usar la plantilla.' }
  revalidatePath('/formularios')
  return { id: data as string }
}

export async function duplicateForm(formId: string): Promise<Result<{ id: string }>> {
  await requireProfessor()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('duplicate_form', { p_form_id: formId })
  if (error || !data) return { error: error?.message ?? 'No se pudo duplicar.' }
  revalidatePath('/formularios')
  return { id: data as string }
}

export async function saveFormAsTemplate(formId: string): Promise<Result<{ id: string }>> {
  await requireProfessor()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('save_form_as_template', { p_form_id: formId })
  if (error || !data) return { error: error?.message ?? 'No se pudo guardar como plantilla.' }
  revalidatePath('/formularios')
  return { id: data as string }
}

export async function renameForm(
  formId: string,
  name: string,
  description: string,
): Promise<Result> {
  await requireProfessor()
  const trimmed = name.trim()
  if (!trimmed) return { error: 'El formulario necesita un nombre.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('forms')
    .update({ name: trimmed, description: description.trim() || null })
    .eq('id', formId)
  if (error) return { error: error.message }
  revalidatePath(`/formularios/${formId}`)
  return {}
}

export async function setFormStatus(
  formId: string,
  status: 'draft' | 'archived',
): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  const { error } = await supabase
    .from('forms')
    .update({ status, archived_at: status === 'archived' ? new Date().toISOString() : null })
    .eq('id', formId)
  if (error) return { error: error.message }
  revalidatePath('/formularios')
  return {}
}

export async function publishForm(formId: string): Promise<Result<{ versionId: string }>> {
  await requireProfessor()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('publish_form', { p_form_id: formId })
  if (error || !data) return { error: error?.message ?? 'No se pudo publicar.' }
  revalidatePath(`/formularios/${formId}`)
  return { versionId: data as string }
}

export async function setFormSports(formId: string, sportIds: string[]): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  await supabase.from('form_sports').delete().eq('form_id', formId)
  const ids = [...new Set(sportIds.filter(Boolean))]
  if (ids.length > 0) {
    const { error } = await supabase
      .from('form_sports')
      .insert(ids.map((sport_id) => ({ form_id: formId, sport_id })))
    if (error) return { error: error.message }
  }
  revalidatePath(`/formularios/${formId}`)
  return {}
}

// ============================================================
// Envío a un alumno / prospecto — genera el link /f/<token>
// ============================================================
export async function createSubmission(input: {
  formId: string
  studentId?: string | null
  inviteeName?: string
  inviteeContact?: string
  expiresInDays?: number
}): Promise<Result<{ token: string; url: string }>> {
  const professor = await requireProfessor()
  const supabase = await createClient()

  const { data: version } = await supabase
    .from('form_versions')
    .select('id')
    .eq('form_id', input.formId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!version) return { error: 'Publicá el formulario antes de enviarlo.' }

  const token = randomBytes(24).toString('base64url')
  const days = input.expiresInDays ?? 30
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString()

  const { error } = await supabase.from('form_submissions').insert({
    form_id: input.formId,
    form_version_id: version.id,
    professor_id: professor.id,
    student_id: input.studentId ?? null,
    invitee_name: input.inviteeName?.trim() || null,
    invitee_contact: input.inviteeContact?.trim() || null,
    token,
    status: 'pending',
    expires_at: expiresAt,
  })
  if (error) return { error: error.message }

  revalidatePath(`/formularios/${input.formId}`)
  return { token, url: `/f/${token}` }
}
