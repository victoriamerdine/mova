import { blockHasRounds, type SaveDayBlockKind } from '@/lib/plan-blocks'
import type { PlanDay } from '@/lib/supabase/queries/plan-editor'
import type { SaveDayBlockPayload } from '@/app/planes/[planId]/actions'

/**
 * Estado editable de un día en el Constructor. Vive en PlanEditorClient
 * (uno por día de la semana cargada) para que navegar entre días NO pierda
 * lo que se fue cargando — se guarda todo junto con "Guardar plan".
 */
export type DraftItem = {
  tempId: string
  exerciseId: string | null
  exerciseName: string
  patternOrMuscleId: string | null
  activityName: string
  label: string
  sets: string
  reps: string
  intensityRpe: string
  restLabel: string
  notes: string
}

export type DraftBlock = {
  tempId: string
  kind: SaveDayBlockKind
  rounds: string
  items: DraftItem[]
}

let tempIdCounter = 0
export const nextTempId = () => `tmp-${tempIdCounter++}`

/** Normaliza para búsqueda: sin acentos, minúsculas. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export const EXERCISE_DRAG_TYPE = 'application/x-mova-exercise'

export function dayToDraft(day: PlanDay): DraftBlock[] {
  return day.blocks.map((block) => ({
    tempId: nextTempId(),
    kind: block.kind === 'COMBINADO' || block.kind === 'CIRCUITO' ? block.kind : 'INDIVIDUAL',
    rounds: block.rounds != null ? String(block.rounds) : '3',
    items: block.items.map((item) => ({
      tempId: nextTempId(),
      exerciseId: item.exerciseId,
      exerciseName: item.exerciseName ?? item.activityName ?? '',
      patternOrMuscleId: item.patternId ?? item.muscleId ?? null,
      activityName: item.exerciseId ? '' : (item.activityName ?? ''),
      label: item.label ?? '',
      sets: item.prescription?.sets ?? '',
      reps: item.prescription?.reps ?? '',
      intensityRpe: item.prescription?.intensityRpe ?? '',
      restLabel: item.prescription?.restLabel ?? '',
      notes: item.prescription?.notes ?? '',
    })),
  }))
}

export function emptyItem(prefill?: Partial<DraftItem>): DraftItem {
  return {
    tempId: nextTempId(),
    exerciseId: null,
    exerciseName: '',
    patternOrMuscleId: null,
    activityName: '',
    label: '',
    sets: prefill?.sets ?? '',
    reps: prefill?.reps ?? '',
    intensityRpe: prefill?.intensityRpe ?? '',
    restLabel: '',
    notes: '',
  }
}

/** Draft de un día → payload que espera el RPC de guardado. */
export function draftToPayload(blocks: DraftBlock[]): SaveDayBlockPayload[] {
  return blocks.map((block) => ({
    kind: block.kind,
    rounds: blockHasRounds(block.kind) ? parseInt(block.rounds, 10) || null : null,
    items: block.items
      .filter((item) => item.exerciseId || item.activityName.trim() || item.exerciseName.trim())
      .map((item) => ({
        exerciseId: item.exerciseId,
        activityName: item.exerciseId ? null : item.activityName || item.exerciseName,
        label: blockHasRounds(block.kind) ? item.label : null,
        sets: item.sets,
        reps: item.reps,
        intensityRpe: item.intensityRpe,
        restLabel: item.restLabel,
        notes: item.notes,
      })),
  }))
}
