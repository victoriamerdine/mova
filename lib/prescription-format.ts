/**
 * Prescripción: campos numéricos "de resistencia / actividad" (tiempo,
 * distancia) que el profesor escribe como texto libre pero la base guarda
 * como número (`workout_prescriptions.time_sec` / `.distance_m`, ambos
 * enteros — se usan para analítica: horas semanales, distancia real, etc.).
 *
 * Mismo principio que el resto del editor: el borrador vive como string, el
 * parseo pasa recién al persistir, y es TOLERANTE — si no se entiende, se
 * guarda null y no rompe nada. Al releer, se formatea de forma predecible.
 */

/** Número tolerante: primer valor numérico del string ("60 kg" → 60, "1.5" → 1.5). null si no hay. */
export function parseLooseNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return match ? parseFloat(match[0]) : null
}

/**
 * Texto de tiempo → segundos enteros.
 *  "3:30" → 210 · "3:05:10" → 11110 · "45" → 45 · "45 s" → 45 ·
 *  "3 min" → 180 · "1.5 min" → 90 · "2h" → 7200
 */
export function parseTimeToSec(value: string | null | undefined): number | null {
  if (!value) return null
  const raw = value.trim().toLowerCase()
  if (!raw) return null

  // hh:mm:ss / mm:ss
  if (raw.includes(':')) {
    const parts = raw.split(':').map((p) => Number(p.trim()))
    if (parts.some((n) => Number.isNaN(n))) return null
    const secs = parts.reduce((acc, n) => acc * 60 + n, 0)
    return Math.round(secs)
  }

  const num = parseLooseNumber(raw)
  if (num == null) return null
  // Unidad = lo que queda al sacar dígitos, espacios y signos.
  const unit = raw.replace(/[\d\s.,:+-]+/g, '')
  if (unit.startsWith('h')) return Math.round(num * 3600) // "2h", "1 hora"
  if (unit.startsWith('m')) return Math.round(num * 60) // "3 min", "3m"
  // "45", "45 s", "45 seg" → segundos
  return Math.round(num)
}

/** Segundos → etiqueta predecible: <60 → "45 s" · múltiplo exacto de minuto → "3 min" · resto → "3:05". */
export function formatSecToLabel(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return ''
  if (sec < 60) return `${sec} s`
  if (sec % 60 === 0) return `${sec / 60} min`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Texto de distancia → metros enteros.
 *  "400" → 400 (se asume metros) · "400 m" → 400 · "5 km" → 5000 ·
 *  "5k" → 5000 · "1.5km" → 1500
 */
export function parseDistanceToM(value: string | null | undefined): number | null {
  if (!value) return null
  const raw = value.trim().toLowerCase()
  const num = parseLooseNumber(raw)
  if (num == null) return null
  if (/k/.test(raw)) return Math.round(num * 1000) // "km", "k"
  return Math.round(num)
}

/** Metros → etiqueta predecible: múltiplo exacto de 1000 → "5 km" · resto → "400 m". */
export function formatMToLabel(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m) || m < 0) return ''
  if (m >= 1000 && m % 1000 === 0) return `${m / 1000} km`
  return `${m} m`
}

/** "" → null, texto → trim. Para columnas de texto libre (pace, tempo). */
export function textOrNull(value: string | null | undefined): string | null {
  const t = (value ?? '').trim()
  return t === '' ? null : t
}
