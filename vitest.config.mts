import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Tests unitarios de la lógica pura (sin DB, sin DOM): reglas de
 * formularios, cálculo de volumen, parseo de prescripción, helpers de
 * biblioteca e importación CSV. Lo que necesita Supabase/RLS se prueba a
 * mano contra el proyecto real (ver PRs del sistema de formularios).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
