import { describe, expect, it } from 'vitest'

import { draftBlockToPayload, draftItemToPayload } from '@/lib/ai/draft-mapping'
import type { PlanDraftPayload } from '@/lib/ai/tools'

type DraftBlock = PlanDraftPayload['weeks'][number]['days'][number]['blocks'][number]
type DraftItem = DraftBlock['items'][number]

function item(overrides: Partial<DraftItem> = {}): DraftItem {
  return {
    exerciseId: null,
    activityName: 'Sentadilla',
    sets: '4',
    reps: '8',
    loadKg: null,
    intensityRpe: null,
    restLabel: null,
    notes: null,
    ...overrides,
  }
}

describe('draft-mapping', () => {
  it('draftItemToPayload: usa activityName cuando no hay exerciseId', () => {
    const payload = draftItemToPayload(item({ exerciseId: null, activityName: 'Rodaje 5km' }), null)
    expect(payload.exerciseId).toBeNull()
    expect(payload.activityName).toBe('Rodaje 5km')
    expect(payload.label).toBeNull()
  })

  it('draftItemToPayload: prioriza exerciseId y descarta activityName', () => {
    const payload = draftItemToPayload(item({ exerciseId: 'ex-1', activityName: 'no debería usarse' }), 'A1')
    expect(payload.exerciseId).toBe('ex-1')
    expect(payload.activityName).toBeNull()
    expect(payload.label).toBe('A1')
  })

  it('draftItemToPayload: null pasa a string vacío en los campos de texto', () => {
    const payload = draftItemToPayload(item({ sets: null, reps: null, intensityRpe: null, restLabel: null, notes: null }), null)
    expect(payload.sets).toBe('')
    expect(payload.reps).toBe('')
    expect(payload.intensityRpe).toBe('')
    expect(payload.restLabel).toBe('')
    expect(payload.notes).toBe('')
  })

  it('draftBlockToPayload: bloques INDIVIDUAL no llevan label ni rounds', () => {
    const block: DraftBlock = { kind: 'INDIVIDUAL', rounds: null, items: [item(), item()] }
    const payload = draftBlockToPayload(block)
    expect(payload.rounds).toBeNull()
    expect(payload.items.map((i) => i.label)).toEqual([null, null])
  })

  it('draftBlockToPayload: COMBINADO/CIRCUITO etiquetan A1, A2, A3… igual que el editor manual', () => {
    const block: DraftBlock = { kind: 'COMBINADO', rounds: 3, items: [item(), item(), item()] }
    const payload = draftBlockToPayload(block)
    expect(payload.rounds).toBe(3)
    expect(payload.items.map((i) => i.label)).toEqual(['A1', 'A2', 'A3'])
  })

  it('draftBlockToPayload: CIRCUITO sin rounds explícitas queda null', () => {
    const block: DraftBlock = { kind: 'CIRCUITO', rounds: null, items: [item()] }
    const payload = draftBlockToPayload(block)
    expect(payload.rounds).toBeNull()
    expect(payload.items[0].label).toBe('A1')
  })
})
