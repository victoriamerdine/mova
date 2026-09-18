import { describe, expect, it } from 'vitest'

import { buildSiteUrl } from '@/lib/site-url'

describe('buildSiteUrl', () => {
  it('usa https para un dominio de producción', () => {
    expect(buildSiteUrl('plan-status-898043.vercel.app', null)).toBe('https://plan-status-898043.vercel.app')
  })

  it('respeta x-forwarded-proto', () => {
    expect(buildSiteUrl('app.mova.com', 'https')).toBe('https://app.mova.com')
  })

  it('usa http para localhost, con puerto', () => {
    expect(buildSiteUrl('localhost:3000', null)).toBe('http://localhost:3000')
    expect(buildSiteUrl('127.0.0.1:3000', null)).toBe('http://127.0.0.1:3000')
  })

  it('toma el primer valor cuando el proxy manda una lista', () => {
    expect(buildSiteUrl('app.mova.com, internal.host', 'https,http')).toBe('https://app.mova.com')
  })

  it('cae a localhost si no hay host', () => {
    expect(buildSiteUrl(null, null)).toBe('http://localhost:3000')
  })

  it('no confunde un dominio que empieza con "localhost"', () => {
    expect(buildSiteUrl('localhost.evil.com', null)).toBe('https://localhost.evil.com')
  })
})
