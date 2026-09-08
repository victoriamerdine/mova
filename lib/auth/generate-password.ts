/**
 * Contraseña legible para dictar/compartir por WhatsApp: sin 0/o/1/l/i que
 * se confunden. La usan el alta de alumno por usuario y el reseteo de
 * contraseña por el profesor.
 */
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

export function generatePassword(length = 10): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]
  }
  return out
}
