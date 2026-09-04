/**
 * Alumno por usuario y contraseña (sin email) — ver migración
 * supabase/migrations/20260828000014_student_username_login.sql.
 *
 * Supabase Auth no tiene login por username nativo: se genera un email
 * SINTÉTICO determinístico a partir del username, con un TLD reservado
 * (RFC 2606) que nunca recibe correo real. El login reconstruye el mismo
 * email con `usernameToSyntheticEmail` — no hay tabla de lookup.
 *
 * Sin 'use server': lo usan tanto el cliente (validar mientras se escribe)
 * como los server actions (crear cuenta, loguear).
 */

export const STUDENT_USERNAME_DOMAIN = 'alumno.mova.invalid'

const USERNAME_PATTERN = /^[a-z0-9._-]{3,24}$/

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}

export function usernameToSyntheticEmail(username: string): string {
  return `${username}@${STUDENT_USERNAME_DOMAIN}`
}
