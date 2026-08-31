import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Cliente de Supabase para Client Components ('use client'). Misma anon
 * key que el cliente de servidor — la seguridad real la hace RLS, no la
 * clave.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
