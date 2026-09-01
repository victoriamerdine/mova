'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'
import type { Database } from '@/lib/supabase/database.types'

type PlanType = Database['public']['Tables']['plans']['Row']['plan_type']

const PLAN_TYPES: PlanType[] = ['MUSCLE', 'PATTERN', 'MIXED', 'SPORT_SPECIFIC', 'CUSTOM']

function toPlanType(value: string): PlanType {
  return (PLAN_TYPES as string[]).includes(value) ? (value as PlanType) : 'MUSCLE'
}

/**
 * Crea un plan nuevo para el alumno: arranca con 1 semana implícita
 * (MOVA exige el nivel `plan_weeks` en el esquema; acá se colapsa a una
 * sola, invisible en la UI — Focus Entrena no tiene el concepto de
 * "semana", va directo de la rutina a los días) y 2 días en blanco,
 * igual que Focus Entrena.
 */
export async function createPlan(formData: FormData) {
  const professor = await getCurrentProfessor()
  if (!professor) redirect('/login')

  const studentId = String(formData.get('studentId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const planType = toPlanType(String(formData.get('planType') ?? 'MUSCLE'))

  if (!studentId || !name) {
    redirect(`/alumnos/${studentId}?error=Falta el nombre del plan`)
  }

  const supabase = await createClient()

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      student_id: studentId,
      professor_id: professor.id,
      name,
      plan_type: planType,
      start_date: new Date().toISOString().slice(0, 10),
      status: 'active',
    })
    .select('id')
    .single()

  if (planError || !plan) {
    redirect(`/alumnos/${studentId}?error=${encodeURIComponent(planError?.message ?? 'No se pudo crear el plan')}`)
  }

  const { data: week, error: weekError } = await supabase
    .from('plan_weeks')
    .insert({ plan_id: plan!.id, number: 1 })
    .select('id')
    .single()

  if (weekError || !week) {
    redirect(`/alumnos/${studentId}?error=${encodeURIComponent(weekError?.message ?? 'No se pudo crear la semana')}`)
  }

  const { error: workoutsError } = await supabase.from('workouts').insert([
    { week_id: week!.id, name: 'Día 1', order: 0 },
    { week_id: week!.id, name: 'Día 2', order: 1 },
  ])

  if (workoutsError) {
    redirect(`/alumnos/${studentId}?error=${encodeURIComponent(workoutsError.message)}`)
  }

  redirect(`/planes/${plan!.id}`)
}
