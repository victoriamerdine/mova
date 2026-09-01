import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Usa la `anon` key — la autorización real la hace RLS a partir
 * de la cookie de sesión (con sesión, corre como `authenticated`; sin
 * sesión, como `anon` — las tablas de referencia/catálogo lo permiten, el
 * resto sigue exigiendo sesión real).
 *
 * No usar la service_role key acá. La única excepción documentada del
 * proyecto es lib/supabase/service-role.ts (invitar alumnos, una
 * operación de administración de usuarios que no existe en la API normal
 * de Auth) — para cualquier otra cosa, si hace falta bypassear RLS, es
 * señal de que la política de RLS está mal diseñada, no de que haga falta
 * la service_role key.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Llamado desde un Server Component sin poder escribir cookies —
            // se puede ignorar porque el middleware ya refresca la sesión.
          }
        },
      },
    },
  )
}
