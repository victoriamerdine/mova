import { describe, expect, it } from 'vitest'

import {
  DUPLICATE_SIMILARITY_THRESHOLD,
  extractYouTubeId,
  nameSimilarity,
  normalizeExerciseName,
} from '@/lib/library'

describe('extractYouTubeId', () => {
  it('reconoce los formatos habituales de URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0')).toBe('dQw4w9WgXcQ')
  })
  it('null si no hay id válido', () => {
    expect(extractYouTubeId('https://vimeo.com/12345')).toBeNull()
    expect(extractYouTubeId('')).toBeNull()
    expect(extractYouTubeId(null)).toBeNull()
  })
})

describe('normalizeExerciseName', () => {
  it('saca acentos, signos, mayúsculas y colapsa espacios', () => {
    expect(normalizeExerciseName('Sentadilla Búlgara (mancuerna)')).toBe('sentadilla bulgara mancuerna')
    expect(normalizeExerciseName('  Press   Militar  ')).toBe('press militar')
  })
})

describe('nameSimilarity', () => {
  it('1 cuando los tokens significativos coinciden (ignora stopwords)', () => {
    expect(nameSimilarity('Remo con barra', 'remo barra')).toBe(1)
  })
  it('nombres distintos dan baja similitud', () => {
    expect(nameSimilarity('Sentadilla', 'Peso muerto')).toBe(0)
  })
  it('similares superan el umbral de "posible duplicado"', () => {
    const s = nameSimilarity('Press banca plano', 'Press de banca plano con barra')
    expect(s).toBeGreaterThanOrEqual(DUPLICATE_SIMILARITY_THRESHOLD)
  })
  it('parcialmente distinto queda por debajo del umbral', () => {
    const s = nameSimilarity('Curl de bíceps con barra', 'Curl de bíceps martillo alterno con mancuernas')
    expect(s).toBeLessThan(DUPLICATE_SIMILARITY_THRESHOLD)
  })
})
