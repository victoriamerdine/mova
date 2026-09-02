import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Cliente con la service_role key — bypassea RLS por completo.
 *
 * ÚNICO uso legítimo hoy: invitar un alumno nuevo
 * (supabase.auth.admin.inviteUserByEmail en app/alumnos/actions.ts), que
 * es una operación de administración de usuarios que no existe en la API
 * normal de Auth. NO usar esto para leer o escribir datos de negocio — para
 * eso está lib/supabase/server.ts, que respeta RLS.
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
