'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentLibraryActor } from '@/lib/supabase/queries/professor-dashboard'

type Result = { error?: string; id?: string; name?: string }

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Alta de un deporte nuevo — catálogo compartido entre todos los
 * profesores (sin dueño, mismo criterio que `patterns`/`muscles`).
 * Chequeo de unicidad por nombre (`ilike`, no distingue mayúsculas/tildes
 * exactos pero evita duplicados obvios como "Crossfit" / "crossfit").
 */
export async function createSport(name: string): Promise<Result> {
  const professor = await getCurrentLibraryActor()
  if (!professor) redirect('/login')

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Necesita un nombre.' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('sports')
    .select('id, name')
    .ilike('name', trimmed)
    .maybeSingle()
  if (existing) return { error: `Ya existe "${existing.name}".` }

  const { data: row, error } = await supabase
    .from('sports')
    .insert({ name: trimmed, slug: slugify(trimmed), status: 'active' })
    .select('id, name')
    .single()
  if (error || !row) return { error: error?.message ?? 'No se pudo agregar.' }

  revalidatePath('/planes')
  revalidatePath('/alumnos')
  return { id: row.id, name: row.name }
}
