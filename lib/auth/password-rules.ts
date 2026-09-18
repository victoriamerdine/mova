export const MIN_PASSWORD_LENGTH = 8

/** null si la contraseña nueva es válida; si no, el mensaje para mostrar. */
export function validateNewPassword(password: string, confirm?: string): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (confirm !== undefined && password !== confirm) return 'Las contraseñas no coinciden.'
  return null
}
