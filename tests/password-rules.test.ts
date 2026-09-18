import { describe, expect, it } from 'vitest'

import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/lib/auth/password-rules'

describe('validateNewPassword', () => {
  it('acepta una contraseña de largo suficiente', () => {
    expect(validateNewPassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull()
  })

  it('rechaza una contraseña corta', () => {
    expect(validateNewPassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(/al menos 8/)
  })

  it('rechaza una contraseña vacía o que no es texto', () => {
    expect(validateNewPassword('')).not.toBeNull()
    expect(validateNewPassword(undefined as unknown as string)).not.toBeNull()
  })

  it('exige que la confirmación coincida cuando se pasa', () => {
    expect(validateNewPassword('contraseña-larga', 'contraseña-larga')).toBeNull()
    expect(validateNewPassword('contraseña-larga', 'otra-distinta')).toMatch(/no coinciden/)
  })

  it('sin confirmación solo valida el largo', () => {
    expect(validateNewPassword('contraseña-larga')).toBeNull()
  })
})
