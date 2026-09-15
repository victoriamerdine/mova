import { tool } from 'ai'
import { z } from 'zod'

import { normalizeExerciseName } from '@/lib/library'
import type { LibraryItem } from '@/lib/library'
import { getLibraryCatalog, getLibraryItems } from '@/lib/supabase/queries/exercises'
import type { SaveDayBlockKind } from '@/lib/plan-blocks'

/** Registro de lo que hizo la IA — para el log de trazabilidad. */
export type ToolTrace = { name: string; input: unknown; resultIds: string[] }

function norm(v: string): string {
  return normalizeExerciseName(v)
}

function matches(item: LibraryItem, terms: string[]): number {
  if (terms.length === 0) return 1
  const haystacks = [
    norm(item.displayName || item.name),
    norm(item.name),
    norm(item.category),
    norm(item.muscle),
    ...item.sportNames.map(norm),
  ]
  let score = 0
  for (const t of terms) {
    if (!t) continue
    if (haystacks[0].includes(t) || haystacks[1].includes(t)) score += 3
    else if (haystacks.slice(2).some((h) => h.includes(t))) score += 1
    else return 0 // todos los términos tienen que aparecer en algún lado
  }
  return score
}

function listTaxonomyTool(trace: ToolTrace[], lib: () => Promise<LibraryItem[]>) {
  return tool({
    description:
      'Devuelve los nombres exactos de patrones, músculos, deportes y capacidades/estímulos que existen en la biblioteca de MOVA. Llamalo antes de filtrar si no estás seguro de un nombre.',
    inputSchema: z.object({}),
    execute: async () => {
      const [cat, items] = await Promise.all([getLibraryCatalog(), lib()])
      const capacities = [
        ...new Set(
          items
            .map((i) => i.category)
            .filter((c) => c && c !== 'Sin categoría' && !cat.patterns.some((p) => p.name === c)),
        ),
      ].sort()
      trace.push({ name: 'list_taxonomy', input: {}, resultIds: [] })
      return {
        patterns: cat.patterns.map((p) => p.name),
        muscles: cat.muscles.map((m) => m.name),
        sports: cat.sports.map((s) => s.name),
        capacities,
      }
    },
  })
}

function searchExercisesTool(trace: ToolTrace[], lib: () => Promise<LibraryItem[]>) {
  return tool({
    description:
      'Busca ejercicios en la biblioteca real de MOVA. Devuelve solo ejercicios que existen. Combiná texto libre y filtros para acotar. Si no hay resultados, devolvé eso al usuario sin inventar.',
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe('texto libre: parte del nombre o un concepto ("anti-rotación", "unilateral")'),
      sport: z.string().optional().describe('nombre de deporte exacto (ver list_taxonomy)'),
      pattern: z.string().optional().describe('nombre de patrón exacto'),
      muscle: z.string().optional().describe('nombre de músculo exacto'),
      capacity: z.string().optional().describe('capacidad/estímulo, ej. "Potencia"'),
      difficulty: z.enum(['principiante', 'intermedio', 'avanzado']).optional(),
      hasVideo: z.boolean().optional().describe('true = solo con video'),
      limit: z.number().int().min(1).max(25).optional(),
    }),
    execute: async (args) => {
      const items = await lib()
      const terms = norm(args.query ?? '')
        .split(' ')
        .filter((t) => t.length > 1)
      const eqi = (a: string | null | undefined, b: string) => !!a && norm(a) === norm(b)

      const scored = items
        .map((it) => ({ it, score: matches(it, terms) }))
        .filter(({ it, score }) => {
          if (score === 0) return false
          if (args.sport && !it.sportNames.some((s) => eqi(s, args.sport!))) return false
          if (args.pattern && !eqi(it.category, args.pattern)) return false
          if (args.capacity && !eqi(it.category, args.capacity)) return false
          if (args.muscle && !eqi(it.muscle, args.muscle)) return false
          if (args.difficulty && it.difficulty !== args.difficulty) return false
          if (args.hasVideo && !it.videoId) return false
          return true
        })
        .sort((a, b) => b.score - a.score || a.it.name.localeCompare(b.it.name))
        .slice(0, args.limit ?? 12)

      const results = scored.map(({ it }) => ({
        id: it.id,
        name: it.displayName || it.name,
        pattern: it.category,
        muscle: it.muscle,
        difficulty: it.difficulty,
        sports: it.sportNames,
        hasVideo: !!it.videoId,
      }))

      trace.push({
        name: 'search_exercises',
        input: args,
        resultIds: results.map((r) => r.id),
      })
      return { count: results.length, results }
    },
  })
}

/**
 * Tools para la función "Buscar"/"Recomendar". Cargan la biblioteca real
 * (RLS del profesor aplica) y filtran en memoria — con ~1.400 ejercicios
 * alcanza y evita SQL dinámico. `trace` acumula lo que se consultó.
 */
export function buildSearchTools(trace: ToolTrace[]) {
  let libPromise: Promise<LibraryItem[]> | null = null
  const lib = () => (libPromise ??= getLibraryItems())

  return {
    list_taxonomy: listTaxonomyTool(trace, lib),
    search_exercises: searchExercisesTool(trace, lib),
  }
}

const BLOCK_KINDS = [
  'INDIVIDUAL',
  'COMBINADO',
  'CIRCUITO',
  'CALENTAMIENTO',
  'ACTIVACION',
  'MOVILIDAD',
  'RECUPERACION',
  'TECNICA',
  'TACTICA',
] as const satisfies readonly SaveDayBlockKind[]

const draftItemSchema = z.object({
  exerciseId: z
    .string()
    .nullable()
    .describe(
      'id EXACTO de un ejercicio devuelto por search_exercises. null si este ítem es una actividad libre (correr, partido, descanso activo) sin ejercicio de biblioteca.',
    ),
  activityName: z
    .string()
    .nullable()
    .describe('nombre libre del ítem SOLO cuando exerciseId es null (ej. "5 km a ritmo suave")'),
  sets: z.string().nullable().describe('series, como texto: "3", "4", o null si no aplica'),
  reps: z.string().nullable().describe('repeticiones o duración/distancia como texto: "10", "12-15", "20 min"'),
  loadKg: z.number().nullable().describe('carga en kg si corresponde prescribirla, o null'),
  intensityRpe: z.string().nullable().describe('RPE objetivo (1-10) como texto, o null'),
  restLabel: z.string().nullable().describe('pausa entre series, ej. "90 s", "2 min", o null'),
  notes: z.string().nullable(),
})

const draftBlockSchema = z.object({
  kind: z.enum(BLOCK_KINDS),
  rounds: z.number().int().nullable().describe('solo si kind es COMBINADO o CIRCUITO; si no, null'),
  items: z.array(draftItemSchema).min(1),
})

const draftDaySchema = z.object({
  name: z.string().describe('nombre del día, ej. "Día 1", "Lunes — Fuerza"'),
  blocks: z.array(draftBlockSchema).min(1),
})

const draftWeekSchema = z.object({
  name: z.string().nullable().describe('ej. "Semana 1 — Adaptación", o null'),
  days: z.array(draftDaySchema).min(1),
})

export const planDraftSchema = z.object({
  planName: z.string(),
  summary: z
    .string()
    .describe('2-3 frases en español explicando la lógica del plan, para que el profesor la lea antes de aprobar'),
  weeks: z.array(draftWeekSchema).min(1).max(8),
})

export type PlanDraftPayload = z.infer<typeof planDraftSchema>

/**
 * Tools para "Generar borrador" (CLAUDE.md §33.4): además de buscar en la
 * biblioteca real, expone `create_plan_draft` para que el modelo entregue
 * la estructura completa del plan como su llamada final. `onDraft` captura
 * ese payload — la validación de que cada `exerciseId` haya salido de
 * verdad de `search_exercises` la hace `runPlanDraftAssistant` (lib/ai/run.ts),
 * no acá.
 */
export function buildDraftTools(trace: ToolTrace[], onDraft: (draft: PlanDraftPayload) => void) {
  let libPromise: Promise<LibraryItem[]> | null = null
  const lib = () => (libPromise ??= getLibraryItems())

  return {
    list_taxonomy: listTaxonomyTool(trace, lib),
    search_exercises: searchExercisesTool(trace, lib),
    create_plan_draft: tool({
      description:
        'Guarda el borrador de plan completo. Llamalo UNA sola vez, al final, después de buscar los ejercicios que vas a usar. Todo exerciseId tiene que venir de un resultado real de search_exercises.',
      inputSchema: planDraftSchema,
      execute: async (args) => {
        trace.push({ name: 'create_plan_draft', input: args, resultIds: [] })
        onDraft(args)
        return { ok: true }
      },
    }),
  }
}
