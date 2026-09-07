/**
 * Importación de ejercicios por CSV. Parseo tolerante (comillas, delimitador
 * `,` o `;` autodetectado) y mapeo de encabezados por alias, así el
 * entrenador puede pegar un CSV exportado de Excel sin ajustarlo.
 */

import type { LibraryDifficulty } from '@/lib/library'
import { normalizeExerciseName } from '@/lib/library'

export type CsvRow = {
  /** 1-based, para mostrar "fila N" en errores. */
  line: number
  name: string
  pattern: string
  muscle: string
  difficulty: LibraryDifficulty | null
  videoUrl: string
  description: string
  instructions: string
  /** De la columna `propiedad` si viene ("mio"/"publico"); si no, null. */
  owned: boolean | null
  error: string | null
}

const HEADER_ALIASES: Record<string, keyof Omit<CsvRow, 'line' | 'error'>> = {
  nombre: 'name',
  name: 'name',
  ejercicio: 'name',
  patron: 'pattern',
  patrón: 'pattern',
  musculo: 'muscle',
  músculo: 'muscle',
  dificultad: 'difficulty',
  nivel: 'difficulty',
  video: 'videoUrl',
  'video url': 'videoUrl',
  video_url: 'videoUrl',
  link: 'videoUrl',
  'link de video': 'videoUrl',
  descripcion: 'description',
  descripción: 'description',
  instrucciones: 'instructions',
  errores: 'instructions',
  propiedad: 'owned',
  duenio: 'owned',
  dueño: 'owned',
}

const DIFFICULTIES: LibraryDifficulty[] = ['principiante', 'intermedio', 'avanzado']

function detectDelimiter(firstLine: string): ',' | ';' | '\t' {
  const counts: Record<string, number> = {
    ',': (firstLine.match(/,/g) ?? []).length,
    ';': (firstLine.match(/;/g) ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
  }
  const best = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ',') as
    | ','
    | ';'
    | '\t'
  return best
}

/** Parser RFC4180-ish: comillas dobles, saltos de línea dentro de comillas, delimitador dado. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  const src = text.replace(/\r\n?/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function rowsFromCsv(text: string): CsvRow[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const firstLine = trimmed.split('\n')[0]
  const delimiter = detectDelimiter(firstLine)
  const matrix = parseCsv(trimmed, delimiter).filter((r) => r.some((c) => c.trim() !== ''))
  if (matrix.length < 2) return []

  const header = matrix[0].map((h) =>
    HEADER_ALIASES[
      h
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
    ] ?? null,
  )
  // Si no reconocemos "name" en ningún encabezado, asumimos la 1ª columna.
  if (!header.includes('name')) header[0] = 'name'

  return matrix.slice(1).map((cells, idx) => {
    const get = (key: keyof Omit<CsvRow, 'line' | 'error'>) => {
      const col = header.indexOf(key)
      return col >= 0 ? (cells[col] ?? '').trim() : ''
    }

    const name = get('name')
    const rawDiff = get('difficulty').toLowerCase()
    const difficulty = DIFFICULTIES.find((d) => rawDiff.startsWith(d.slice(0, 4))) ?? null
    const rawOwned = get('owned').toLowerCase()
    const owned =
      rawOwned === ''
        ? null
        : /^(mi|mio|mío|si|sí|true|1|privad)/.test(rawOwned)
          ? true
          : /^(pub|no|false|0)/.test(rawOwned)
            ? false
            : null

    return {
      line: idx + 2,
      name,
      pattern: get('pattern'),
      muscle: get('muscle'),
      difficulty,
      videoUrl: get('videoUrl'),
      description: get('description'),
      instructions: get('instructions'),
      owned,
      error: name ? null : 'Sin nombre',
    }
  })
}

/** Mapea un nombre de patrón/músculo del CSV a un id del catálogo (por nombre normalizado). */
export function matchCatalogId(
  value: string,
  options: { id: string; name: string }[],
): string | null {
  const norm = normalizeExerciseName(value)
  if (!norm) return null
  return options.find((o) => normalizeExerciseName(o.name) === norm)?.id ?? null
}
