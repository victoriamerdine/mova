import type { QuestionConfig, QuestionType } from '@/lib/forms/types'

/**
 * Registry de tipos de pregunta. Agregar un tipo nuevo = una entrada acá
 * (+ sumarlo al check de la migración y al input del formulario del
 * alumno). El builder y el render se manejan solo con estos metadatos.
 */
export type QuestionTypeMeta = {
  type: QuestionType
  label: string
  group: 'texto' | 'elección' | 'número' | 'fecha' | 'medidas' | 'archivo'
  /** usa la tabla form_question_options */
  hasOptions: boolean
  defaultConfig: QuestionConfig
  /** campos de config editables en el builder */
  configFields: ConfigField[]
  /** disponible en la v1 */
  available: boolean
}

type ConfigField =
  | { key: keyof QuestionConfig; kind: 'number'; label: string }
  | { key: keyof QuestionConfig; kind: 'text'; label: string }
  | { key: keyof QuestionConfig; kind: 'select'; label: string; options: string[] }
  | { key: keyof QuestionConfig; kind: 'bool'; label: string }

const UNIT = (label: string, options: string[]): ConfigField => ({
  key: 'unit',
  kind: 'select',
  label,
  options,
})

export const QUESTION_TYPES: QuestionTypeMeta[] = [
  {
    type: 'short_text',
    label: 'Texto corto',
    group: 'texto',
    hasOptions: false,
    defaultConfig: {},
    configFields: [{ key: 'maxLength', kind: 'number', label: 'Máx. caracteres' }],
    available: true,
  },
  {
    type: 'long_text',
    label: 'Texto largo',
    group: 'texto',
    hasOptions: false,
    defaultConfig: {},
    configFields: [{ key: 'maxLength', kind: 'number', label: 'Máx. caracteres' }],
    available: true,
  },
  {
    type: 'number',
    label: 'Número',
    group: 'número',
    hasOptions: false,
    defaultConfig: {},
    configFields: [
      { key: 'min', kind: 'number', label: 'Mínimo' },
      { key: 'max', kind: 'number', label: 'Máximo' },
      { key: 'step', kind: 'number', label: 'Paso' },
      { key: 'unit', kind: 'text', label: 'Unidad' },
    ],
    available: true,
  },
  {
    type: 'yes_no',
    label: 'Sí / No',
    group: 'elección',
    hasOptions: false,
    defaultConfig: {},
    configFields: [],
    available: true,
  },
  {
    type: 'single_select',
    label: 'Selección única',
    group: 'elección',
    hasOptions: true,
    defaultConfig: {},
    configFields: [{ key: 'allowOther', kind: 'bool', label: 'Permitir "Otro"' }],
    available: true,
  },
  {
    type: 'multi_select',
    label: 'Selección múltiple',
    group: 'elección',
    hasOptions: true,
    defaultConfig: {},
    configFields: [{ key: 'allowOther', kind: 'bool', label: 'Permitir "Otro"' }],
    available: true,
  },
  {
    type: 'scale',
    label: 'Escala',
    group: 'elección',
    hasOptions: false,
    defaultConfig: { min: 1, max: 10 },
    configFields: [
      { key: 'min', kind: 'number', label: 'Desde' },
      { key: 'max', kind: 'number', label: 'Hasta' },
      { key: 'minLabel', kind: 'text', label: 'Etiqueta mínimo' },
      { key: 'maxLabel', kind: 'text', label: 'Etiqueta máximo' },
    ],
    available: true,
  },
  {
    type: 'date',
    label: 'Fecha',
    group: 'fecha',
    hasOptions: false,
    defaultConfig: {},
    configFields: [],
    available: true,
  },
  {
    type: 'birth_date',
    label: 'Fecha de nacimiento',
    group: 'fecha',
    hasOptions: false,
    defaultConfig: {},
    configFields: [],
    available: true,
  },
  {
    type: 'weight',
    label: 'Peso',
    group: 'medidas',
    hasOptions: false,
    defaultConfig: { unit: 'kg' },
    configFields: [UNIT('Unidad', ['kg', 'lb'])],
    available: true,
  },
  {
    type: 'height',
    label: 'Altura',
    group: 'medidas',
    hasOptions: false,
    defaultConfig: { unit: 'cm' },
    configFields: [UNIT('Unidad', ['cm', 'm', 'ft'])],
    available: true,
  },
  {
    type: 'duration',
    label: 'Duración',
    group: 'medidas',
    hasOptions: false,
    defaultConfig: { unit: 'min' },
    configFields: [UNIT('Unidad', ['min', 'hh:mm', 's'])],
    available: true,
  },
  {
    type: 'distance',
    label: 'Distancia',
    group: 'medidas',
    hasOptions: false,
    defaultConfig: { unit: 'km' },
    configFields: [UNIT('Unidad', ['km', 'm'])],
    available: true,
  },
  {
    type: 'pace',
    label: 'Ritmo',
    group: 'medidas',
    hasOptions: false,
    defaultConfig: { unit: 'min/km' },
    configFields: [UNIT('Unidad', ['min/km', 'min/mi'])],
    available: true,
  },
  {
    type: 'file',
    label: 'Archivo',
    group: 'archivo',
    hasOptions: false,
    defaultConfig: { maxSizeMB: 10 },
    configFields: [
      { key: 'accept', kind: 'text', label: 'Tipos aceptados (ej. image/*,.pdf)' },
      { key: 'maxSizeMB', kind: 'number', label: 'Tamaño máx. (MB)' },
    ],
    // El bucket + upload por token van en el paso 8.
    available: false,
  },
  {
    type: 'video',
    label: 'Video',
    group: 'archivo',
    hasOptions: false,
    defaultConfig: {},
    configFields: [],
    // Diferido al servicio de video (CLAUDE.md §11).
    available: false,
  },
]

export const QUESTION_TYPE_BY_KEY: Record<QuestionType, QuestionTypeMeta> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.type, t]),
) as Record<QuestionType, QuestionTypeMeta>

export const AVAILABLE_QUESTION_TYPES = QUESTION_TYPES.filter((t) => t.available)
