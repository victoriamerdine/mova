import { describe, expect, it } from 'vitest'

import { evaluateRules, missingRequired } from '@/lib/forms/rules'
import type {
  FormRule,
  FormStructure,
  RuleAction,
  RuleCondition,
  SnapshotQuestion,
  SnapshotSection,
} from '@/lib/forms/types'

// ---------- fixtures ----------
function q(id: string, over: Partial<SnapshotQuestion> = {}): SnapshotQuestion {
  return {
    id,
    order: 0,
    type: 'short_text',
    label: id,
    helpText: null,
    required: false,
    sensitive: false,
    config: {},
    options: [],
    ...over,
  }
}

function section(id: string, questions: SnapshotQuestion[], over: Partial<SnapshotSection> = {}): SnapshotSection {
  return { id, order: 0, title: id, description: null, sensitive: false, questions, ...over }
}

function rule(
  action: RuleAction,
  target: FormRule['target'],
  when: RuleCondition[],
  match: 'all' | 'any' = 'all',
): FormRule {
  return { id: `r-${action}-${target.id}`, order: 0, when, match, action, target }
}

function structure(sections: SnapshotSection[], rules: FormRule[] = []): FormStructure {
  return { sections, rules }
}

// ---------- evaluateRules ----------
describe('evaluateRules — visibilidad por defecto', () => {
  it('sin reglas, todo se ve y nada es obligatorio por regla', () => {
    const s = structure([section('s1', [q('a'), q('b')])])
    const r = evaluateRules(s, {})
    expect(r.hiddenQuestionIds.size).toBe(0)
    expect(r.hiddenSectionIds.size).toBe(0)
    expect(r.requiredQuestionIds.size).toBe(0)
  })
})

describe('evaluateRules — show', () => {
  const base = structure(
    [section('s1', [q('trigger', { type: 'yes_no' }), q('detalle', { type: 'long_text' })])],
    [rule('show', { kind: 'question', id: 'detalle' }, [{ questionId: 'trigger', op: 'eq', value: true }])],
  )

  it('oculta el destino mientras la condición NO se cumple', () => {
    expect(evaluateRules(base, {}).hiddenQuestionIds.has('detalle')).toBe(true)
    expect(evaluateRules(base, { trigger: false }).hiddenQuestionIds.has('detalle')).toBe(true)
  })

  it('muestra el destino cuando la condición se cumple (bool ↔ "true")', () => {
    expect(evaluateRules(base, { trigger: true }).hiddenQuestionIds.has('detalle')).toBe(false)
  })
})

describe('evaluateRules — hide', () => {
  const base = structure(
    [section('s1', [q('edad', { type: 'number' }), q('tutor')])],
    [rule('hide', { kind: 'question', id: 'tutor' }, [{ questionId: 'edad', op: 'gt', value: 17 }])],
  )

  it('no oculta nada si la condición no se cumple', () => {
    expect(evaluateRules(base, { edad: 15 }).hiddenQuestionIds.has('tutor')).toBe(false)
  })

  it('oculta cuando la condición se cumple', () => {
    expect(evaluateRules(base, { edad: 25 }).hiddenQuestionIds.has('tutor')).toBe(true)
  })
})

describe('evaluateRules — require', () => {
  const base = structure(
    [section('s1', [q('lesion', { type: 'yes_no' }), q('detalle')])],
    [rule('require', { kind: 'question', id: 'detalle' }, [{ questionId: 'lesion', op: 'eq', value: true }])],
  )

  it('marca obligatoria sólo cuando la condición se cumple', () => {
    expect(evaluateRules(base, {}).requiredQuestionIds.has('detalle')).toBe(false)
    expect(evaluateRules(base, { lesion: true }).requiredQuestionIds.has('detalle')).toBe(true)
  })
})

describe('evaluateRules — sección oculta arrastra sus preguntas', () => {
  const s = structure(
    [
      section('s1', [q('practica', { type: 'yes_no' })]),
      section('deporte', [q('cual'), q('nivel')]),
    ],
    [rule('show', { kind: 'section', id: 'deporte' }, [{ questionId: 'practica', op: 'eq', value: true }])],
  )

  it('sección no visible ⇒ sus preguntas también quedan ocultas', () => {
    const r = evaluateRules(s, { practica: false })
    expect(r.hiddenSectionIds.has('deporte')).toBe(true)
    expect(r.hiddenQuestionIds.has('cual')).toBe(true)
    expect(r.hiddenQuestionIds.has('nivel')).toBe(true)
  })

  it('sección visible ⇒ sus preguntas se ven', () => {
    const r = evaluateRules(s, { practica: true })
    expect(r.hiddenSectionIds.has('deporte')).toBe(false)
    expect(r.hiddenQuestionIds.has('cual')).toBe(false)
  })
})

describe('evaluateRules — match all / any', () => {
  const mk = (match: 'all' | 'any') =>
    structure(
      [section('s1', [q('a', { type: 'number' }), q('b', { type: 'number' }), q('target')])],
      [
        rule(
          'show',
          { kind: 'question', id: 'target' },
          [
            { questionId: 'a', op: 'gt', value: 10 },
            { questionId: 'b', op: 'gt', value: 10 },
          ],
          match,
        ),
      ],
    )

  it('all: se muestra sólo si TODAS las condiciones se cumplen', () => {
    expect(evaluateRules(mk('all'), { a: 20, b: 5 }).hiddenQuestionIds.has('target')).toBe(true)
    expect(evaluateRules(mk('all'), { a: 20, b: 20 }).hiddenQuestionIds.has('target')).toBe(false)
  })

  it('any: se muestra si al menos UNA se cumple', () => {
    expect(evaluateRules(mk('any'), { a: 20, b: 5 }).hiddenQuestionIds.has('target')).toBe(false)
    expect(evaluateRules(mk('any'), { a: 5, b: 5 }).hiddenQuestionIds.has('target')).toBe(true)
  })
})

describe('evaluateRules — operadores', () => {
  const target = { kind: 'question' as const, id: 't' }
  const withCond = (cond: RuleCondition) =>
    structure(
      [section('s1', [q('x'), q('t')])],
      [rule('show', target, [cond])],
    )
  const shows = (cond: RuleCondition, answers: Record<string, unknown>) =>
    !evaluateRules(withCond(cond), answers).hiddenQuestionIds.has('t')

  it('eq / neq comparan como string y miran dentro de arrays (multi_select)', () => {
    expect(shows({ questionId: 'x', op: 'eq', value: 'si' }, { x: 'si' })).toBe(true)
    expect(shows({ questionId: 'x', op: 'eq', value: 'si' }, { x: ['no', 'si'] })).toBe(true)
    expect(shows({ questionId: 'x', op: 'neq', value: 'si' }, { x: 'no' })).toBe(true)
    expect(shows({ questionId: 'x', op: 'neq', value: 'si' }, { x: 'si' })).toBe(false)
  })

  it('in: intersección entre valores esperados y respondidos', () => {
    expect(shows({ questionId: 'x', op: 'in', value: ['a', 'b'] }, { x: ['b', 'c'] })).toBe(true)
    expect(shows({ questionId: 'x', op: 'in', value: ['a', 'b'] }, { x: ['c'] })).toBe(false)
  })

  it('gt / lt: numérico tolerante (string, {value})', () => {
    expect(shows({ questionId: 'x', op: 'gt', value: 5 }, { x: '10' })).toBe(true)
    expect(shows({ questionId: 'x', op: 'gt', value: 5 }, { x: { value: 3 } })).toBe(false)
    expect(shows({ questionId: 'x', op: 'lt', value: 5 }, { x: 2 })).toBe(true)
    // no numérico ⇒ la condición no se cumple ⇒ show queda oculto
    expect(shows({ questionId: 'x', op: 'gt', value: 5 }, { x: 'muchos' })).toBe(false)
  })

  it('answered / not_answered', () => {
    expect(shows({ questionId: 'x', op: 'answered' }, { x: 'algo' })).toBe(true)
    expect(shows({ questionId: 'x', op: 'answered' }, { x: '   ' })).toBe(false)
    expect(shows({ questionId: 'x', op: 'answered' }, { x: [] })).toBe(false)
    expect(shows({ questionId: 'x', op: 'not_answered' }, {})).toBe(true)
  })
})

// ---------- missingRequired ----------
describe('missingRequired', () => {
  it('lista las obligatorias visibles sin responder, por label', () => {
    const s = structure([
      section('s1', [
        q('nombre', { required: true, label: 'Nombre' }),
        q('email', { required: true, label: 'Email' }),
        q('nota', { label: 'Nota' }),
      ]),
    ])
    expect(missingRequired(s, { nombre: 'Ana' })).toEqual(['Email'])
  })

  it('una obligatoria OCULTA por regla no se exige (formulario condicional)', () => {
    const s = structure(
      [section('s1', [q('tiene', { type: 'yes_no', label: 'Tenés' }), q('detalle', { required: true, label: 'Detalle' })])],
      [rule('show', { kind: 'question', id: 'detalle' }, [{ questionId: 'tiene', op: 'eq', value: true }])],
    )
    expect(missingRequired(s, { tiene: false })).toEqual([])
    expect(missingRequired(s, { tiene: true })).toEqual(['Detalle'])
  })

  it('obligatoria por regla require: cuenta como faltante si no se responde', () => {
    const s = structure(
      [section('s1', [q('lesion', { type: 'yes_no', label: 'Lesión' }), q('detalle', { label: 'Detalle' })])],
      [rule('require', { kind: 'question', id: 'detalle' }, [{ questionId: 'lesion', op: 'eq', value: true }])],
    )
    expect(missingRequired(s, { lesion: true })).toEqual(['Detalle'])
    expect(missingRequired(s, { lesion: true, detalle: 'me duele' })).toEqual([])
  })

  it('respuestas de preguntas que ya no existen en el snapshot no rompen nada', () => {
    const s = structure([section('s1', [q('a', { required: true, label: 'A' })])])
    expect(missingRequired(s, { fantasma: 'x', a: 'ok' })).toEqual([])
  })
})
