/**
 * Tipos compartidos del sistema de formularios — el snapshot que devuelve
 * `publish_form` / `get_submission` y la forma de las reglas. Sin
 * dependencias de servidor: lo usa el builder del profesor y el formulario
 * del alumno.
 */

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'birth_date'
  | 'single_select'
  | 'multi_select'
  | 'scale'
  | 'yes_no'
  | 'weight'
  | 'height'
  | 'duration'
  | 'distance'
  | 'pace'
  | 'file'
  | 'video'

export type FormStatus = 'draft' | 'published' | 'archived'
export type SubmissionStatus = 'pending' | 'started' | 'completed' | 'expired'

export type QuestionConfig = {
  /** number / weight / height / distance / duration */
  min?: number
  max?: number
  step?: number
  unit?: string
  /** short_text / long_text */
  maxLength?: number
  /** scale */
  minLabel?: string
  maxLabel?: string
  /** select con opción "otro" */
  allowOther?: boolean
  /** file */
  accept?: string
  maxSizeMB?: number
}

export type QuestionOption = { id: string; order: number; value: string; label: string }

export type SnapshotQuestion = {
  id: string
  order: number
  type: QuestionType
  label: string
  helpText: string | null
  required: boolean
  sensitive: boolean
  config: QuestionConfig
  options: QuestionOption[]
}

export type SnapshotSection = {
  id: string
  order: number
  title: string | null
  description: string | null
  sensitive: boolean
  questions: SnapshotQuestion[]
}

export type RuleOperator = 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'answered' | 'not_answered'
export type RuleCondition = { questionId: string; op: RuleOperator; value?: unknown }
export type RuleAction = 'show' | 'hide' | 'require' | 'skip_to'
export type RuleTarget = { kind: 'question' | 'section'; id: string }

export type FormRule = {
  id: string
  order: number
  when: RuleCondition[]
  match: 'all' | 'any'
  action: RuleAction
  target: RuleTarget
}

export type FormStructure = {
  sections: SnapshotSection[]
  rules: FormRule[]
}

/** Lo que devuelve `get_submission(token)`. */
export type SubmissionView = {
  formName: string
  status: SubmissionStatus
  structure: FormStructure
  progress: Record<string, unknown>
  answers: Record<string, unknown>
  consentAccepted: boolean
  completedAt: string | null
}

export function structureHasSensitive(structure: FormStructure): boolean {
  return structure.sections.some(
    (s) => s.sensitive || s.questions.some((q) => q.sensitive),
  )
}

export function countQuestions(structure: FormStructure): number {
  return structure.sections.reduce((n, s) => n + s.questions.length, 0)
}
