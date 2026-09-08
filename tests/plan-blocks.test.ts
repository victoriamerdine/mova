import { describe, expect, it } from 'vitest'

import {
  BLOCK_KIND_LABEL,
  NON_ROUNDS_BLOCK_KINDS,
  SECTION_BLOCK_KINDS,
  blockHasRounds,
  isKnownBlockKind,
} from '@/lib/plan-blocks'
import { PHASE_KIND_LABEL, PHASE_KIND_OPTIONS, isPhaseKind } from '@/lib/plan-phases'

describe('plan-blocks', () => {
  it('blockHasRounds: sólo COMBINADO y CIRCUITO', () => {
    expect(blockHasRounds('COMBINADO')).toBe(true)
    expect(blockHasRounds('CIRCUITO')).toBe(true)
    for (const k of NON_ROUNDS_BLOCK_KINDS) expect(blockHasRounds(k)).toBe(false)
  })

  it('las secciones nunca tienen vueltas y son un subconjunto de los kinds sin vueltas', () => {
    for (const k of SECTION_BLOCK_KINDS) {
      expect(blockHasRounds(k)).toBe(false)
      expect(NON_ROUNDS_BLOCK_KINDS).toContain(k)
    }
    expect(NON_ROUNDS_BLOCK_KINDS[0]).toBe('INDIVIDUAL')
  })

  it('isKnownBlockKind reconoce las claves del label y rechaza el resto', () => {
    for (const k of Object.keys(BLOCK_KIND_LABEL)) expect(isKnownBlockKind(k)).toBe(true)
    expect(isKnownBlockKind('SUPERSET')).toBe(false)
    expect(isKnownBlockKind('')).toBe(false)
  })
})

describe('plan-phases', () => {
  it('isPhaseKind valida contra las claves conocidas', () => {
    expect(isPhaseKind('competencia')).toBe(true)
    expect(isPhaseKind('custom')).toBe(true)
    expect(isPhaseKind('vacaciones')).toBe(false)
  })

  it('PHASE_KIND_OPTIONS refleja el label, en el mismo orden', () => {
    expect(PHASE_KIND_OPTIONS.map((o) => o.value)).toEqual(Object.keys(PHASE_KIND_LABEL))
    for (const o of PHASE_KIND_OPTIONS) expect(o.label).toBe(PHASE_KIND_LABEL[o.value])
  })
})
