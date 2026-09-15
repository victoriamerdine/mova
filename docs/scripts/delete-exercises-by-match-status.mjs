// Borra en lote ejercicios de la biblioteca según su `match_status`
// (el campo que viene de la importación original, ver
// docs/auditoria-02-planificacion-y-biblioteca.md y
// supabase/migrations/20260828000003_exercise_library.sql).
//
// Usado para limpiar la biblioteca de video dudoso/ausente: primero
// 'aproximado_revisar' + 'ambiguo' (el filtro "Video · A revisar" de
// /biblioteca), después 'sin_video_encontrado' aparte. Se deja acá,
// parametrizado, para poder repetir la limpieza si vuelve a hacer falta
// (por ejemplo tras una nueva importación).
//
// A diferencia de deleteExercise() en app/biblioteca/actions.ts (que
// archiva el ejercicio si está en uso en algún plan), este script SIEMPRE
// borra el ejercicio. Si estaba usado en un training_item, ese item se
// convierte a kind='ACTIVITY' con activity_name = nombre del ejercicio
// (mismo shape que un ítem de texto libre, ya soportado por el editor y la
// vista del alumno vía el fallback exerciseName ?? activityName) — así el
// plan lo conserva sin depender de la fila de exercises que se borra. Las
// prescripciones (workout_prescriptions, atadas a training_item_id, no a
// exercise_id) quedan intactas.
//
// Uso (desde la raíz del repo):
//   node docs/scripts/delete-exercises-by-match-status.mjs <estado1,estado2,...>
//   node docs/scripts/delete-exercises-by-match-status.mjs <estados> --apply
//
// Ejemplos:
//   node docs/scripts/delete-exercises-by-match-status.mjs aproximado_revisar,ambiguo
//   node docs/scripts/delete-exercises-by-match-status.mjs sin_video_encontrado --apply
//
// Sin --apply hace dry run (solo cuenta y lista, no modifica nada).
// Valores válidos de match_status: coincidencia_exacta, coincidencia_probable,
// aproximado_revisar, ambiguo, sin_video_encontrado.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CHUNK = 200

function loadEnv(envPath) {
  const values = {}
  try {
    const text = readFileSync(envPath, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      let value = m[1] && m[2] !== undefined ? m[2].trim() : ''
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      values[m[1]] = value
    }
  } catch {
    // sin .env.local: seguimos solo con variables ya exportadas
  }
  return values
}

function getCredentials() {
  const fileEnv = loadEnv(path.join(REPO_ROOT, '.env.local'))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. ' +
        'Corré esto desde la raíz del repo con .env.local presente, o exportá las variables antes.',
    )
    process.exit(1)
  }
  return { url, key }
}

const VALID_STATUSES = [
  'coincidencia_exacta',
  'coincidencia_probable',
  'aproximado_revisar',
  'ambiguo',
  'sin_video_encontrado',
]

function parseArgs() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const statusArg = args.find((a) => !a.startsWith('--'))
  if (!statusArg) {
    console.error('Uso: node docs/scripts/delete-exercises-by-match-status.mjs <estado1,estado2,...> [--apply]')
    console.error(`Estados válidos: ${VALID_STATUSES.join(', ')}`)
    process.exit(1)
  }
  const statuses = statusArg.split(',').map((s) => s.trim())
  const invalid = statuses.filter((s) => !VALID_STATUSES.includes(s))
  if (invalid.length > 0) {
    console.error(`Estado(s) inválido(s): ${invalid.join(', ')}`)
    console.error(`Estados válidos: ${VALID_STATUSES.join(', ')}`)
    process.exit(1)
  }
  return { statuses, apply }
}

async function main() {
  const { statuses, apply } = parseArgs()
  const { url, key } = getCredentials()
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  console.log(`Conectando a ${url}`)
  console.log(`Criterio: match_status in (${statuses.join(', ')})`)
  console.log(apply ? 'MODO: APLICAR CAMBIOS' : 'MODO: DRY RUN (no se modifica nada)')
  console.log('---')

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, canonical_name, display_name, match_status')
    .in('match_status', statuses)
  if (error) throw error

  console.log(`Ejercicios a borrar: ${exercises.length}`)
  if (exercises.length === 0) {
    console.log('Nada para hacer.')
    return
  }

  const ids = exercises.map((e) => e.id)
  const nameById = new Map(exercises.map((e) => [e.id, e.display_name || e.canonical_name]))

  const affectedItems = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const { data: items, error: itemsErr } = await supabase
      .from('training_items')
      .select('id, exercise_id')
      .in('exercise_id', chunk)
    if (itemsErr) throw itemsErr
    affectedItems.push(...items)
  }

  console.log(
    `Ejercicios usados en algún plan (training_items): ${new Set(affectedItems.map((i) => i.exercise_id)).size}`,
  )
  console.log(`Total de training_items que se van a des-vincular (pasan a ACTIVITY): ${affectedItems.length}`)
  if (affectedItems.length > 0) {
    const sample = [...new Set(affectedItems.map((i) => nameById.get(i.exercise_id)))].slice(0, 15)
    console.log('Ejemplos de ejercicios en uso que se van a des-vincular:')
    for (const n of sample) console.log(`  - ${n}`)
  }

  if (!apply) {
    console.log('---')
    console.log('Dry run: no se modificó nada. Agregá --apply para ejecutar de verdad.')
    return
  }

  console.log('---')
  console.log('Aplicando...')

  // 1) Des-vincular training_items ANTES de borrar el ejercicio: la FK
  //    exercise_id -> exercises no tiene ON DELETE CASCADE ni SET NULL,
  //    así que borrar con items todavía apuntándolo falla.
  let unlinkedCount = 0
  for (const ex of exercises) {
    const name = nameById.get(ex.id)
    const { error: updErr, count } = await supabase
      .from('training_items')
      .update(
        { kind: 'ACTIVITY', exercise_id: null, activity_id: null, activity_name: name },
        { count: 'exact' },
      )
      .eq('exercise_id', ex.id)
    if (updErr) {
      console.error(`Error des-vinculando training_items de "${name}" (${ex.id}):`, updErr.message)
      process.exit(1)
    }
    unlinkedCount += count ?? 0
  }
  console.log(`training_items des-vinculados: ${unlinkedCount}`)

  // 2) Borrar los ejercicios (cascada sobre exercise_media, exercise_muscles,
  //    exercise_patterns, exercise_capacities, exercise_sports,
  //    exercise_aliases, exercise_change_requests).
  let deletedCount = 0
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const { error: delErr, count } = await supabase.from('exercises').delete({ count: 'exact' }).in('id', chunk)
    if (delErr) {
      console.error('Error borrando lote de exercises:', delErr.message)
      process.exit(1)
    }
    deletedCount += count ?? 0
  }
  console.log(`Ejercicios borrados: ${deletedCount}`)
  console.log('Listo.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
