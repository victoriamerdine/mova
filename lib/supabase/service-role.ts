import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Cliente con la service_role key — bypassea RLS por completo.
 *
 * Usos legítimos hoy, ambos en app/alumnos/actions.ts, ambos operaciones de
 * administración de Auth que no existen en la API normal:
 * 1. Invitar un alumno por email (`admin.auth.inviteUserByEmail`).
 * 2. Crear un alumno por usuario/contraseña (`admin.auth.createUser`,
 *    createStudentWithUsername) — y, justo ahí, guardar el `phone` opcional
 *    en `students`: la única política RLS de esa tabla es "el alumno edita
 *    su propia fila" (auth.users.id = auth.uid()), no hay ninguna que deje
 *    escribir al profesor, así que el teléfono no se podría guardar con el
 *    cliente normal en ese mismo paso.
 *
 * NO usar esto para leer o escribir cualquier otro dato de negocio — para
 * eso está lib/supabase/server.ts, que respeta RLS. Si en el futuro el
 * profesor necesita editar más campos de `students` (nivel, notas, etc.),
 * eso pide una policy RLS nueva, no más usos de este cliente.
 *
 * Server-only: si esto se importara desde un Client Component, Next.js
 * fallaría el build al intentar exponer SUPABASE_SERVICE_ROLE_KEY al
 * bundle del navegador (no tiene prefijo NEXT_PUBLIC_).
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
