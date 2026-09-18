import { headers } from 'next/headers'

const FALLBACK = 'http://localhost:3000'

const firstValue = (v: string | null) => v?.split(',')[0]?.trim() || null

/** Arma `https://host` a partir de los headers del request. Pura, testeable. */
export function buildSiteUrl(host: string | null, proto: string | null): string {
  const h = firstValue(host)
  if (!h) return FALLBACK
  const scheme = firstValue(proto) ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(h) ? 'http' : 'https')
  return `${scheme}://${h}`
}

/**
 * URL pública desde la que se está usando la app, para links que salen del
 * navegador y vuelven después (emails de Supabase Auth: confirmar cuenta,
 * invitación). Se deriva del request en vez de fijarla en una env var, así
 * producción apunta a producción y `pnpm dev` a localhost sin configurar
 * nada. Supabase igual valida el destino contra su lista de "Redirect URLs".
 */
export async function getSiteUrl(): Promise<string> {
  const h = await headers()
  return buildSiteUrl(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'))
}
