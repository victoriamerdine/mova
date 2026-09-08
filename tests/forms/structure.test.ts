import { describe, expect, it } from 'vitest'

import {
  AVAILABLE_QUESTION_TYPES,
  QUESTION_TYPES,
  QUESTION_TYPE_BY_KEY,
} from '@/lib/forms/question-types'
import { countQuestions, structureHasSensitive } from '@/lib/forms/types'
import type { FormStructure, QuestionType, SnapshotSection } from '@/lib/forms/types'

const ALL_TYPES: QuestionType[] = [
  'short_text', 'long_text', 'number', 'date', 'birth_date',
  'single_select', 'multi_select', 'scale', 'yes_no',
  'weight', 'height', 'duration', 'distance', 'pace',
  'file', 'video',
]

function sec(over: Partial<SnapshotSection> = {}): SnapshotSection {
  return { id: 's', order: 0, title: null, description: null, sensitive: false, questions: [], ...over }
}
const question = (over = {}) => ({
  id: 'q', order: 0, type: 'short_text' as const, label: 'q',
  helpText: null, required: false, sensitive: false, config: {}, options: [], ...over,
})

describe('registry de tipos de pregunta', () => {
  it('hay exactamente una entrada por cada QuestionType del union', () => {
    expect(QUESTION_TYPES.map((t) => t.type).sort()).toEqual([...ALL_TYPES].sort())
    expect(new Set(QUESTION_TYPES.map((t) => t.type)).size).toBe(ALL_TYPES.length)
  })

  it('QUESTION_TYPE_BY_KEY resuelve todos los tipos', () => {
    for (const t of ALL_TYPES) expect(QUESTION_TYPE_BY_KEY[t]?.type).toBe(t)
  })

  it('AVAILABLE_QUESTION_TYPES = los available, e incluye "file" pero no "video"', () => {
    const keys = AVAILABLE_QUESTION_TYPES.map((t) => t.type)
    expect(keys).toContain('file')
    expect(keys).not.toContain('video')
    expect(AVAILABLE_QUESTION_TYPES.every((t) => t.available)).toBe(true)
  })

  it('los tipos con opciones son exactamente single_select y multi_select', () => {
    const withOptions = QUESTION_TYPES.filter((t) => t.hasOptions).map((t) => t.type).sort()
    expect(withOptions).toEqual(['multi_select', 'single_select'])
  })

  it('cada configField apunta a una key real de QuestionConfig', () => {
    const validKeys = new Set([
      'min', 'max', 'step', 'unit', 'maxLength', 'minLabel', 'maxLabel',
      'allowOther', 'accept', 'maxSizeMB',
    ])
    for (const t of QUESTION_TYPES) {
      for (const f of t.configFields) expect(validKeys.has(f.key)).toBe(true)
    }
  })
})

describe('structureHasSensitive', () => {
  const wrap = (sections: SnapshotSection[]): FormStructure => ({ sections, rules: [] })

  it('false si nada es sensible', () => {
    expect(structureHasSensitive(wrap([sec({ questions: [question()] })]))).toBe(false)
  })
  it('true si la sección es sensible', () => {
    expect(structureHasSensitive(wrap([sec({ sensitive: true })]))).toBe(true)
  })
  it('true si alguna pregunta es sensible', () => {
    expect(structureHasSensitive(wrap([sec({ questions: [question({ sensitive: true })] })]))).toBe(true)
  })
})

describe('countQuestions', () => {
  it('suma las preguntas de todas las secciones', () => {
    const s: FormStructure = {
      sections: [
        sec({ questions: [question(), question()] }),
        sec({ questions: [question()] }),
        sec({ questions: [] }),
      ],
      rules: [],
    }
    expect(countQuestions(s)).toBe(3)
  })
})
