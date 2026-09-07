import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import type { FormStatus, QuestionConfig, QuestionType } from '@/lib/forms/types'

export type FormListItem = {
  id: string
  name: string
  description: string | null
  status: FormStatus
  isTemplate: boolean
  sportNames: string[]
  questionCount: number
  responseCount: number
  publishedVersion: number | null
  createdAt: string
}

export async function getProfessorForms(): Promise<FormListItem[]> {
  const supabase = await createClient()
  const professor = await getCurrentProfessor()
  if (!professor) return []

  const { data, error } = await supabase
    .from('forms')
    .select(
      `
      id, name, description, status, is_template, created_at,
      form_sports(sports(name)),
      form_questions(count),
      form_submissions(count),
      form_versions(version)
    `,
    )
    .eq('professor_id', professor.id)
    .eq('is_template', false)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as unknown as {
    id: string
    name: string
    description: string | null
    status: FormStatus
    is_template: boolean
    created_at: string
    form_sports: { sports: { name: string } | null }[]
    form_questions: { count: number }[]
    form_submissions: { count: number }[]
    form_versions: { version: number }[]
  }[]).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    status: f.status,
    isTemplate: f.is_template,
    sportNames: (f.form_sports ?? []).map((s) => s.sports?.name).filter((n): n is string => !!n),
    questionCount: f.form_questions?.[0]?.count ?? 0,
    responseCount: f.form_submissions?.[0]?.count ?? 0,
    publishedVersion:
      (f.form_versions ?? []).reduce((max, v) => Math.max(max, v.version), 0) || null,
    createdAt: f.created_at,
  }))
}

export type EditorQuestion = {
  id: string
  sectionId: string
  order: number
  type: QuestionType
  label: string
  helpText: string | null
  required: boolean
  sensitive: boolean
  config: QuestionConfig
  options: { id: string; order: number; value: string; label: string }[]
}

export type EditorSection = {
  id: string
  order: number
  title: string | null
  description: string | null
  sensitive: boolean
  questions: EditorQuestion[]
}

export type FormForEditor = {
  id: string
  name: string
  description: string | null
  status: FormStatus
  sportIds: string[]
  sections: EditorSection[]
  publishedVersion: number | null
  /** true si hay ediciones sin publicar (heurística: hay preguntas y no hay versión, o cambió algo — v1: solo si nunca se publicó). */
  hasDraftChanges: boolean
}

export async function getFormForEditor(formId: string): Promise<FormForEditor | null> {
  const supabase = await createClient()

  const { data: form, error } = await supabase
    .from('forms')
    .select('id, name, description, status, form_sports(sport_id)')
    .eq('id', formId)
    .maybeSingle()
  if (error || !form) return null

  const [{ data: sections }, { data: questions }, { data: options }, { data: versions }] =
    await Promise.all([
      supabase.from('form_sections').select('*').eq('form_id', formId).order('order'),
      supabase.from('form_questions').select('*').eq('form_id', formId).order('order'),
      supabase.from('form_question_options').select('*').eq('form_id', formId).order('order'),
      supabase.from('form_versions').select('version').eq('form_id', formId),
    ])

  const optionsByQuestion = new Map<string, EditorQuestion['options']>()
  for (const o of options ?? []) {
    const list = optionsByQuestion.get(o.question_id) ?? []
    list.push({ id: o.id, order: o.order, value: o.value, label: o.label })
    optionsByQuestion.set(o.question_id, list)
  }

  const questionsBySection = new Map<string, EditorQuestion[]>()
  for (const q of questions ?? []) {
    const list = questionsBySection.get(q.section_id) ?? []
    list.push({
      id: q.id,
      sectionId: q.section_id,
      order: q.order,
      type: q.type,
      label: q.label,
      helpText: q.help_text,
      required: q.required,
      sensitive: q.sensitive,
      config: (q.config ?? {}) as QuestionConfig,
      options: optionsByQuestion.get(q.id) ?? [],
    })
    questionsBySection.set(q.section_id, list)
  }

  const editorSections: EditorSection[] = (sections ?? []).map((s) => ({
    id: s.id,
    order: s.order,
    title: s.title,
    description: s.description,
    sensitive: s.sensitive,
    questions: questionsBySection.get(s.id) ?? [],
  }))

  const publishedVersion =
    (versions ?? []).reduce((max, v) => Math.max(max, v.version), 0) || null

  return {
    id: form.id,
    name: form.name,
    description: form.description,
    status: form.status,
    sportIds: (form.form_sports as { sport_id: string }[] | null)?.map((s) => s.sport_id) ?? [],
    sections: editorSections,
    publishedVersion,
    hasDraftChanges:
      publishedVersion == null && editorSections.some((s) => s.questions.length > 0),
  }
}

export async function getSystemTemplates(): Promise<{ id: string; name: string; description: string | null }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('forms')
    .select('id, name, description')
    .eq('is_template', true)
    .is('professor_id', null)
    .order('name')
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, description: t.description }))
}
