import { blockHasRounds } from '@/lib/plan-blocks'
import type { SaveDayBlockPayload, SaveDayItemPayload } from '@/app/planes/[planId]/actions'
import type { PlanDraftPayload } from '@/lib/ai/tools'

type DraftItem = PlanDraftPayload['weeks'][number]['days'][number]['blocks'][number]['items'][number]
type DraftBlock = PlanDraftPayload['weeks'][number]['days'][number]['blocks'][number]

/**
 * Convierte un item de borrador de IA al shape que espera save_workout_day.
 * `label` sigue la misma convención que el editor manual (day-editor.tsx
 * `relabel()`): "A1"/"A2"/… para bloques con vueltas, vacío para el resto.
 */
export function draftItemToPayload(item: DraftItem, label: string | null): SaveDayItemPayload {
  return {
    exerciseId: item.exerciseId,
    activityName: item.exerciseId ? null : item.activityName || 'Actividad',
    label,
    groupLabel: null,
    sets: item.sets ?? '',
    reps: item.reps ?? '',
    loadKg: item.loadKg,
    loadPercent: null,
    intensityRpe: item.intensityRpe ?? '',
    restLabel: item.restLabel ?? '',
    timeSec: null,
    distanceM: null,
    pace: null,
    tempo: null,
    notes: item.notes ?? '',
  }
}

/** Convierte un bloque de borrador de IA al shape que espera save_week_days. */
export function draftBlockToPayload(block: DraftBlock): SaveDayBlockPayload {
  const rounds = blockHasRounds(block.kind)
  return {
    kind: block.kind,
    rounds: rounds ? block.rounds : null,
    items: block.items.map((item, i) => draftItemToPayload(item, rounds ? `A${i + 1}` : null)),
  }
}
