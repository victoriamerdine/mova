'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentPlanActor } from '@/lib/supabase/queries/professor-dashboard'
import type { Database } from '@/lib/supabase/database.types'

type PlanType = Database['public']['Tables']['plans']['Row']['plan_type']

const PLAN_TYPES: PlanType[] = ['MUSCLE', 'PATTERN', 'MIXED', 'SPORT_SPECIFIC', 'CUSTOM']

function toPlanType(value: string): PlanType {
  return (PLAN_TYPES as string[]).includes(value) ? (value as PlanType) : 'MUSCLE'
}

/**
 * Un individuo autocoacheado crea su propio plan (professor_id null — ver
 * supabase/migrations/20260828000008_self_coached_individuals.sql). Mismo
 * shape que `createPlan` de app/alumnos/[studentId]/actions.ts, pero
 * student_id siempre es el propio actor: nunca puede crear un plan para
 * otra persona (lo exige además la RLS de is_own_student).
 */
export async function createOwnPlan(formData: FormData) {
  const actor = await getCurrentPlanActor()
  if (!actor || actor.role !== 'individual') redirect('/login')

  const name = String(formData.get('name') ?? '').trim()
  const planType = toPlanType(String(formData.get('planType') ?? 'MUSCLE'))

  if (!name) {
    redirect(`/planes?error=${encodeURIComponent('Falta el nombre del plan')}`)
  }

  const supabase = await createClient()

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      student_id: actor.id,
      professor_id: null,
      name,
      plan_type: planType,
      start_date: new Date().toISOString().slice(0, 10),
      status: 'active',
    })
    .select('id')
    .single()

  if (planError || !plan) {
    redirect(`/planes?error=${encodeURIComponent(planError?.message ?? 'No se pudo crear el plan')}`)
  }

  const { data: week, error: weekError } = await supabase
    .from('plan_weeks')
    .insert({ plan_id: plan!.id, number: 1 })
    .select('id')
    .single()

  if (weekError || !week) {
    redirect(`/planes?error=${encodeURIComponent(weekError?.message ?? 'No se pudo crear la semana')}`)
  }

  const { error: workoutsError } = await supabase.from('workouts').insert([
    { week_id: week!.id, name: 'Día 1', order: 0 },
    { week_id: week!.id, name: 'Día 2', order: 1 },
  ])

  if (workoutsError) {
    redirect(`/planes?error=${encodeURIComponent(workoutsError.message)}`)
  }

  redirect(`/planes/${plan!.id}`)
}
