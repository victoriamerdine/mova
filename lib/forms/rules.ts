/**
 * Evaluador de lógica condicional. Puro, sin dependencias — lo usa el
 * preview del builder y el formulario del alumno (paso 5). El servidor
 * tiene un espejo en plpgsql (`evaluate_form_rules`, migración 28) que se
 * corre al completar, para no confiar en el cliente.
 *
 * Visibilidad por defecto: una pregunta / sección se VE, salvo que
 *  - una regla `show` la apunte y su condición NO se cumpla, o
 *  - una regla `hide` la apunte y su condición SÍ se cumpla.
 * `require` la vuelve obligatoria si la condición se cumple.
 */

import type { FormRule, FormStructure, RuleCondition } from '@/lib/forms/types'

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v == null ? [] : [v]
}

function isAnswered(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    return Number.isNaN(n) ? null : n
  }
  if (v && typeof v === 'object' && 'value' in v) return num((v as { value: unknown }).value)
  return null
}

function conditionMet(cond: RuleCondition, answers: Record<string, unknown>): boolean {
  const a = answers[cond.questionId]
  switch (cond.op) {
    case 'answered':
      return isAnswered(a)
    case 'not_answered':
      return !isAnswered(a)
    case 'eq':
      return asArray(a).map(String).includes(String(cond.value))
    case 'neq':
      return !asArray(a).map(String).includes(String(cond.value))
    case 'in':
      return asArray(cond.value).map(String).some((x) => asArray(a).map(String).includes(x))
    case 'gt': {
      const l = num(a)
      const r = num(cond.value)
      return l != null && r != null && l > r
    }
    case 'lt': {
      const l = num(a)
      const r = num(cond.value)
      return l != null && r != null && l < r
    }
    default:
      return false
  }
}

function ruleFires(rule: FormRule, answers: Record<string, unknown>): boolean {
  if (rule.when.length === 0) return false
  const results = rule.when.map((c) => conditionMet(c, answers))
  return rule.match === 'any' ? results.some(Boolean) : results.every(Boolean)
}

export type RuleEvaluation = {
  hiddenQuestionIds: Set<string>
  hiddenSectionIds: Set<string>
  requiredQuestionIds: Set<string>
}

export function evaluateRules(
  structure: FormStructure,
  answers: Record<string, unknown>,
): RuleEvaluation {
  const hiddenQuestionIds = new Set<string>()
  const hiddenSectionIds = new Set<string>()
  const requiredQuestionIds = new Set<string>()

  for (const rule of structure.rules) {
    const fires = ruleFires(rule, answers)
    const { kind, id } = rule.target
    const set = kind === 'section' ? hiddenSectionIds : hiddenQuestionIds

    if (rule.action === 'show' && !fires) set.add(id)
    else if (rule.action === 'hide' && fires) set.add(id)
    else if (rule.action === 'require' && fires && kind === 'question') requiredQuestionIds.add(id)
  }

  // Una pregunta dentro de una sección oculta también está oculta.
  for (const section of structure.sections) {
    if (hiddenSectionIds.has(section.id)) {
      for (const q of section.questions) hiddenQuestionIds.add(q.id)
    }
  }

  return { hiddenQuestionIds, hiddenSectionIds, requiredQuestionIds }
}

/** Preguntas visibles y obligatorias que quedan sin responder. */
export function missingRequired(
  structure: FormStructure,
  answers: Record<string, unknown>,
): string[] {
  const { hiddenQuestionIds, requiredQuestionIds } = evaluateRules(structure, answers)
  const missing: string[] = []
  for (const section of structure.sections) {
    for (const q of section.questions) {
      if (hiddenQuestionIds.has(q.id)) continue
      const required = q.required || requiredQuestionIds.has(q.id)
      if (required && !isAnswered(answers[q.id])) missing.push(q.label)
    }
  }
  return missing
}
