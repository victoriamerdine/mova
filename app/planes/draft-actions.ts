'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentPlanActor } from '@/lib/supabase/queries/professor-dashboard'
import { draftBlockToPayload } from '@/lib/ai/draft-mapping'
import { getExercisesByIds } from '@/lib/supabase/queries/exercises'
import type { PlanDraftPayload } from '@/lib/ai/tools'
import type { SaveDayBlockPayload } from '@/app/planes/[planId]/actions'

type Result = { error?: string; planId?: string }

/** Un borrador pendiente, tal como se lista para revisión. */
export type PendingDraft = {
  id: string
  prompt: string | null
  createdAt: string
  payload: PlanDraftPayload
  /** Nombre de cada ejercicio citado por id, para mostrar en vez del uuid crudo. */
  exerciseNames: Record<string, string>
}

export async function getPendingDrafts(studentId: string): Promise<PendingDraft[]> {
  const actor = await getCurrentPlanActor()
  if (!actor) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('plan_drafts')
    .select('id, prompt, payload, created_at')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as { id: string; prompt: string | null; payload: unknown; created_at: string }[]

  const allExerciseIds = rows.flatMap((r) => {
    const payload = r.payload as PlanDraftPayload
    return payload.weeks.flatMap((w) =>
      w.days.flatMap((d) => d.blocks.flatMap((b) => b.items.flatMap((i) => (i.exerciseId ? [i.exerciseId] : [])))),
    )
  })
  const exercises = await getExercisesByIds(allExerciseIds)
  const exerciseNames = Object.fromEntries(exercises.map((e) => [e.id, e.displayName]))

  return rows.map((d) => ({
    id: d.id,
    prompt: d.prompt,
    createdAt: d.created_at,
    payload: d.payload as PlanDraftPayload,
    exerciseNames,
  }))
}

/**
 * Aprueba un borrador de IA: crea el plan/semanas/días reales y guarda los
 * bloques con el mismo RPC que usa el editor manual (save_week_days) — así
 * el resultado es indistinguible de un plan armado a mano, editable
 * normalmente después. Nunca se aplica sin este paso explícito.
 */
export async function applyPlanDraft(draftId: string): Promise<Result> {
  const actor = await getCurrentPlanActor()
  if (!actor || actor.role === 'admin') redirect('/login')

  const supabase = await createClient()
  const { data: draftRow, error: draftErr } = await supabase
    .from('plan_drafts')
    .select('id, student_id, payload, status')
    .eq('id', draftId)
    .maybeSingle()
  if (draftErr || !draftRow) return { error: 'Borrador no encontrado.' }
  if (draftRow.status !== 'pending') return { error: 'Este borrador ya fue revisado.' }

  const payload = draftRow.payload as unknown as PlanDraftPayload

  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .insert({
      student_id: draftRow.student_id,
      professor_id: actor.role === 'professor' ? actor.id : null,
      name: payload.planName,
      plan_type: 'CUSTOM',
      start_date: new Date().toISOString().slice(0, 10),
      status: 'active',
    })
    .select('id')
    .single()
  if (planErr || !plan) return { error: planErr?.message ?? 'No se pudo crear el plan.' }

  for (let weekIndex = 0; weekIndex < payload.weeks.length; weekIndex++) {
    const week = payload.weeks[weekIndex]

    const { data: weekRow, error: weekErr } = await supabase
      .from('plan_weeks')
      .insert({ plan_id: plan.id, number: weekIndex + 1, name: week.name })
      .select('id')
      .single()
    if (weekErr || !weekRow) return { error: weekErr?.message ?? 'No se pudo crear una semana.' }

    const workoutInserts = week.days.map((day, i) => ({
      week_id: weekRow.id,
      name: day.name,
      order: i,
    }))
    const { data: workoutRows, error: workoutErr } = await supabase
      .from('workouts')
      .insert(workoutInserts)
      .select('id, order')
    if (workoutErr || !workoutRows) return { error: workoutErr?.message ?? 'No se pudo crear un día.' }

    const workoutIdByOrder = new Map(workoutRows.map((w) => [w.order, w.id]))

    const days = week.days.map((day, i) => ({
      workoutId: workoutIdByOrder.get(i)!,
      blocks: day.blocks.map((block): SaveDayBlockPayload => draftBlockToPayload(block)),
    }))

    const { error: saveErr } = await supabase.rpc('save_week_days', { p_days: days })
    if (saveErr) return { error: `No se pudo guardar la semana ${weekIndex + 1}: ${saveErr.message}` }
  }

  await supabase
    .from('plan_drafts')
    .update({
      status: 'approved',
      reviewed_by: actor.role === 'professor' ? actor.id : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', draftId)

  revalidatePath(actor.role === 'professor' ? `/alumnos/${draftRow.student_id}` : '/planes')
  return { planId: plan.id }
}

export async function rejectPlanDraft(draftId: string, studentId: string): Promise<Result> {
  const actor = await getCurrentPlanActor()
  if (!actor || actor.role === 'admin') redirect('/login')

  const supabase = await createClient()
  const { error } = await supabase
    .from('plan_drafts')
    .update({
      status: 'rejected',
      reviewed_by: actor.role === 'professor' ? actor.id : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('status', 'pending')
  if (error) return { error: error.message }

  revalidatePath(actor.role === 'professor' ? `/alumnos/${studentId}` : '/planes')
  return {}
}
