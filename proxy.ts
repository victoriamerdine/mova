import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresca la sesión de Supabase en cada request. Next.js 16 renombró
 * `middleware.ts`/`middleware()` a `proxy.ts`/`proxy()` (ver skill
 * vercel:routing-middleware) — este archivo reemplaza al `middleware.ts`
 * que documentaba originalmente Supabase para Next.js.
 *
 * Esto NO es la capa de seguridad — es solo para que la cookie de sesión
 * no expire silenciosamente. La autorización real la hace RLS en cada
 * tabla (ver supabase/migrations/). Hoy no hay login todavía (Fase 5
 * pendiente), así que esto corre pero no tiene ninguna sesión que
 * refrescar — se deja andando desde ya para no tener que acordarse de
 * agregarlo cuando exista auth.
 */
export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // No agregar lógica entre createServerClient() y getUser() — según la
  // propia recomendación de Supabase, cualquier cosa acá en el medio puede
  // hacer muy difícil de debuggear que usuarios se desloguen sin motivo.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
