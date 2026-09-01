import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresca la sesión de Supabase en cada request y protege las pantallas
 * que necesitan saber quién está mirando (dashboard del profesor,
 * constructor de planes). Next.js 16 renombró `middleware.ts`/
 * `middleware()` a `proxy.ts`/`proxy()` (ver skill vercel:routing-middleware)
 * — este archivo reemplaza al `middleware.ts` que documentaba
 * originalmente Supabase para Next.js.
 *
 * Esto NO es la capa de seguridad real — es defensa en profundidad y UX
 * (evita que se vea la pantalla vacía un instante antes de redirigir). La
 * autorización real la sigue haciendo RLS en cada tabla (ver
 * supabase/migrations/), no este archivo.
 *
 * /biblioteca queda deliberadamente fuera de PROTECTED_PATHS — es catálogo
 * público (migración 010), no hace falta sesión para verla.
 */
const PROTECTED_PATHS = ['/', '/constructor', '/alumnos']

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => (path === '/' ? pathname === '/' : pathname.startsWith(path)))
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
