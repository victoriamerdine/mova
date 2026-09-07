'use server'

import { randomBytes } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import { QUESTION_TYPE_BY_KEY } from '@/lib/forms/question-types'
import type { QuestionConfig, QuestionType } from '@/lib/forms/types'
import type { Database } from '@/lib/supabase/database.types'

type Result<T extends object = Record<never, never>> = { error?: string } & Partial<T>

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

export async function deleteForm(formId: string): Promise<Result<{ archived: boolean }>> {
  await requireProfessor()
  const supabase = await createClient()
  // Con respuestas → archivar (no perder datos). Sin respuestas → borrar.
  const { count } = await supabase
    .from('form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', formId)
  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('forms')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', formId)
    if (error) return { error: error.message }
    revalidatePath('/formularios')
    return { archived: true }
  }
  const { error } = await supabase.from('forms').delete().eq('id', formId)
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
// Builder — secciones
// ============================================================
export async function addSection(formId: string): Promise<Result<{ id: string }>> {
  await requireProfessor()
  const supabase = await createClient()
  const { count } = await supabase
    .from('form_sections')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', formId)
  const { data, error } = await supabase
    .from('form_sections')
    .insert({ form_id: formId, order: count ?? 0, title: 'Sección' })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'No se pudo agregar la sección.' }
  revalidatePath(`/formularios/${formId}`)
  return { id: data.id }
}

export async function updateSection(
  formId: string,
  sectionId: string,
  patch: { title?: string; description?: string; sensitive?: boolean },
): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  const update: Database['public']['Tables']['form_sections']['Update'] = {}
  if (patch.title !== undefined) update.title = patch.title.trim() || null
  if (patch.description !== undefined) update.description = patch.description.trim() || null
  if (patch.sensitive !== undefined) update.sensitive = patch.sensitive
  const { error } = await supabase.from('form_sections').update(update).eq('id', sectionId)
  if (error) return { error: error.message }
  revalidatePath(`/formularios/${formId}`)
  return {}
}

export async function deleteSection(formId: string, sectionId: string): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  const { count } = await supabase
    .from('form_sections')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', formId)
  if ((count ?? 0) <= 1) return { error: 'El formulario necesita al menos una sección.' }
  const { error } = await supabase.from('form_sections').delete().eq('id', sectionId)
  if (error) return { error: error.message }
  revalidatePath(`/formularios/${formId}`)
  return {}
}

export async function reorderSections(formId: string, orderedIds: string[]): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, i) => supabase.from('form_sections').update({ order: i }).eq('id', id)),
  )
  revalidatePath(`/formularios/${formId}`)
  return {}
}

// ============================================================
// Builder — preguntas
// ============================================================
export async function addQuestion(
  formId: string,
  sectionId: string,
  type: QuestionType,
): Promise<Result<{ id: string }>> {
  await requireProfessor()
  const meta = QUESTION_TYPE_BY_KEY[type]
  if (!meta || !meta.available) return { error: 'Tipo de pregunta no disponible.' }

  const supabase = await createClient()
  const { count } = await supabase
    .from('form_questions')
    .select('id', { count: 'exact', head: true })
    .eq('section_id', sectionId)

  const { data, error } = await supabase
    .from('form_questions')
    .insert({
      form_id: formId,
      section_id: sectionId,
      order: count ?? 0,
      type,
      label: 'Pregunta nueva',
      required: false,
      sensitive: false,
      config: meta.defaultConfig,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'No se pudo agregar la pregunta.' }

  if (meta.hasOptions) {
    await supabase.from('form_question_options').insert([
      { question_id: data.id, form_id: formId, order: 0, value: 'op1', label: 'Opción 1' },
      { question_id: data.id, form_id: formId, order: 1, value: 'op2', label: 'Opción 2' },
    ])
  }

  revalidatePath(`/formularios/${formId}`)
  return { id: data.id }
}

export async function updateQuestion(
  formId: string,
  questionId: string,
  patch: {
    label?: string
    helpText?: string
    required?: boolean
    sensitive?: boolean
    config?: QuestionConfig
    sectionId?: string
  },
): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  const update: Database['public']['Tables']['form_questions']['Update'] = {}
  if (patch.label !== undefined) update.label = patch.label.trim() || 'Pregunta'
  if (patch.helpText !== undefined) update.help_text = patch.helpText.trim() || null
  if (patch.required !== undefined) update.required = patch.required
  if (patch.sensitive !== undefined) update.sensitive = patch.sensitive
  if (patch.config !== undefined) update.config = patch.config
  if (patch.sectionId !== undefined) update.section_id = patch.sectionId
  const { error } = await supabase.from('form_questions').update(update).eq('id', questionId)
  if (error) return { error: error.message }
  revalidatePath(`/formularios/${formId}`)
  return {}
}

export async function deleteQuestion(formId: string, questionId: string): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  const { error } = await supabase.from('form_questions').delete().eq('id', questionId)
  if (error) return { error: error.message }
  revalidatePath(`/formularios/${formId}`)
  return {}
}

export async function reorderQuestions(
  formId: string,
  sectionId: string,
  orderedIds: string[],
): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('form_questions').update({ order: i, section_id: sectionId }).eq('id', id),
    ),
  )
  revalidatePath(`/formularios/${formId}`)
  return {}
}

export async function setQuestionOptions(
  formId: string,
  questionId: string,
  options: { value: string; label: string }[],
): Promise<Result> {
  await requireProfessor()
  const supabase = await createClient()
  await supabase.from('form_question_options').delete().eq('question_id', questionId)
  const clean = options
    .map((o, i) => ({
      question_id: questionId,
      form_id: formId,
      order: i,
      value: (o.value || o.label).trim().slice(0, 80) || `op${i + 1}`,
      label: o.label.trim() || `Opción ${i + 1}`,
    }))
    .filter((o) => o.label)
  if (clean.length > 0) {
    const { error } = await supabase.from('form_question_options').insert(clean)
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
