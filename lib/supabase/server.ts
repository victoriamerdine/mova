import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Usa la `anon` key — la autorización real la hace RLS a partir
 * de la cookie de sesión (hoy no hay login todavía, ver
 * docs/auditoria-03-arquitectura-objetivo.md Fase 5, así que las queries
 * corren como `anon`; las tablas de referencia/catálogo ya lo permiten,
 * el resto sigue exigiendo sesión).
 *
 * Nunca usar la service_role key acá — esa vive solo en los scripts de
 * scripts/ (Python), nunca en el código de la app.
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
