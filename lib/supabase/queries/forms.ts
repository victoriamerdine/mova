import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import type {
  FormRule,
  FormStatus,
  FormStructure,
  QuestionConfig,
  QuestionType,
  RuleCondition,
} from '@/lib/forms/types'

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

export type EditorRule = FormRule

export type FormForEditor = {
  id: string
  name: string
  description: string | null
  status: FormStatus
  sportIds: string[]
  sections: EditorSection[]
  rules: EditorRule[]
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

  const [{ data: sections }, { data: questions }, { data: options }, { data: rules }, { data: versions }] =
    await Promise.all([
      supabase.from('form_sections').select('*').eq('form_id', formId).order('order'),
      supabase.from('form_questions').select('*').eq('form_id', formId).order('order'),
      supabase.from('form_question_options').select('*').eq('form_id', formId).order('order'),
      supabase.from('form_rules').select('*').eq('form_id', formId).order('order'),
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

  const editorRules: EditorRule[] = (rules ?? []).map((r) => ({
    id: r.id,
    order: r.order,
    when: (r.when ?? []) as RuleCondition[],
    match: r.match,
    action: r.action,
    target: r.target as EditorRule['target'],
  }))

  return {
    id: form.id,
    name: form.name,
    description: form.description,
    status: form.status,
    sportIds: (form.form_sports as { sport_id: string }[] | null)?.map((s) => s.sport_id) ?? [],
    sections: editorSections,
    rules: editorRules,
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

// ============================================================
// Respuestas (paso 6)
// ============================================================
export type SubmissionListItem = {
  id: string
  respondent: string
  isProspect: boolean
  status: 'pending' | 'started' | 'completed' | 'expired'
  answered: number
  total: number
  createdAt: string
  completedAt: string | null
  token: string
}

export async function getFormMeta(formId: string): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('forms').select('id, name').eq('id', formId).maybeSingle()
  return data ? { id: data.id, name: data.name } : null
}

export async function getFormSubmissions(formId: string): Promise<SubmissionListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
      id, status, invitee_name, invitee_contact, token, created_at, completed_at, student_id,
      students(profiles(full_name)),
      form_versions(structure),
      form_answers(id)
    `,
    )
    .eq('form_id', formId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as unknown as {
    id: string
    status: SubmissionListItem['status']
    invitee_name: string | null
    invitee_contact: string | null
    token: string
    created_at: string
    completed_at: string | null
    student_id: string | null
    students: { profiles: { full_name: string } | null } | null
    form_versions: { structure: { sections: { questions: unknown[] }[] } } | null
    form_answers: { id: string }[]
  }[]).map((s) => {
    const total =
      s.form_versions?.structure?.sections?.reduce((n, sec) => n + (sec.questions?.length ?? 0), 0) ??
      0
    return {
      id: s.id,
      respondent:
        s.students?.profiles?.full_name ??
        s.invitee_name ??
        s.invitee_contact ??
        'Sin nombre',
      isProspect: s.student_id == null,
      status: s.status,
      answered: s.form_answers?.length ?? 0,
      total,
      createdAt: s.created_at,
      completedAt: s.completed_at,
      token: s.token,
    }
  })
}

export type SubmissionDetail = {
  id: string
  formId: string
  formName: string
  respondent: string
  contact: string | null
  status: SubmissionListItem['status']
  createdAt: string
  completedAt: string | null
  token: string
  studentId: string | null
  student: {
    level: string | null
    availability: string | null
    equipmentAccess: string | null
    notes: string | null
    primarySportId: string | null
  } | null
  structure: FormStructure
  answers: Record<string, unknown>
}

export async function getSubmissionDetail(submissionId: string): Promise<SubmissionDetail | null> {
  const supabase = await createClient()
  const { data: s, error } = await supabase
    .from('form_submissions')
    .select(
      `
      id, form_id, status, invitee_name, invitee_contact, token, created_at, completed_at, student_id,
      forms(name),
      form_versions(structure),
      students(level, availability, equipment_access, notes, primary_sport_id, profiles(full_name))
    `,
    )
    .eq('id', submissionId)
    .maybeSingle()

  if (error || !s) return null
  const row = s as unknown as {
    id: string
    form_id: string
    status: SubmissionDetail['status']
    invitee_name: string | null
    invitee_contact: string | null
    token: string
    created_at: string
    completed_at: string | null
    student_id: string | null
    forms: { name: string } | null
    form_versions: { structure: FormStructure } | null
    students: {
      level: string | null
      availability: string | null
      equipment_access: string | null
      notes: string | null
      primary_sport_id: string | null
      profiles: { full_name: string } | null
    } | null
  }

  const { data: answerRows } = await supabase
    .from('form_answers')
    .select('question_id, value')
    .eq('submission_id', submissionId)
  const answers: Record<string, unknown> = {}
  for (const a of answerRows ?? []) answers[a.question_id] = a.value

  return {
    id: row.id,
    formId: row.form_id,
    formName: row.forms?.name ?? 'Formulario',
    respondent: row.students?.profiles?.full_name ?? row.invitee_name ?? 'Sin nombre',
    contact: row.invitee_contact,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    token: row.token,
    studentId: row.student_id,
    student: row.students
      ? {
          level: row.students.level,
          availability: row.students.availability,
          equipmentAccess: row.students.equipment_access,
          notes: row.students.notes,
          primarySportId: row.students.primary_sport_id,
        }
      : null,
    structure: row.form_versions?.structure ?? { sections: [], rules: [] },
    answers,
  }
}
