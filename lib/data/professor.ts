export type StudentStatus = 'al-dia' | 'atencion' | 'riesgo'

export type Student = {
  id: string
  name: string
  initials: string
  goal: 'Fuerza' | 'Salud' | 'Acondicionamiento' | 'Potencia' | 'Hipertrofia'
  level: 'Inicial' | 'Intermedio' | 'Avanzado'
  plan: string
  nextSession: {
    label: string
    day: string
    focus: string
  }
  adherence: number
  status: StudentStatus
}

export const statusMeta: Record<
  StudentStatus,
  { label: string; dot: string; text: string }
> = {
  'al-dia': {
    label: 'Al día',
    dot: 'bg-primary',
    text: 'text-foreground',
  },
  atencion: {
    label: 'Revisar',
    dot: 'bg-warning',
    text: 'text-foreground',
  },
  riesgo: {
    label: 'Sin registro',
    dot: 'bg-destructive',
    text: 'text-foreground',
  },
}

export const metrics = [
  {
    id: 'alumnos',
    label: 'Total alumnos',
    value: 24,
    unit: '',
    detail: '3 nuevos este mes',
    trend: '+3',
    trendTone: 'positive' as const,
  },
  {
    id: 'planes',
    label: 'Planes activos',
    value: 21,
    unit: '',
    detail: '2 mesociclos cierran el viernes',
    trend: '87%',
    trendTone: 'neutral' as const,
  },
  {
    id: 'sesiones',
    label: 'Entrenamientos hoy',
    value: 17,
    unit: '',
    detail: '9 completados · 8 pendientes',
    trend: '53%',
    trendTone: 'neutral' as const,
  },
  {
    id: 'alertas',
    label: 'Alertas',
    value: 3,
    unit: '',
    detail: 'Volumen y adherencia',
    trend: 'Acción',
    trendTone: 'warning' as const,
  },
]

export const alerts = [
  {
    id: 'a1',
    student: 'Juan Peralta',
    title: 'El plan de Juan incrementa 30% el volumen de cuádriceps',
    detail: 'Semana 3 · 22 series vs 17 la semana pasada · RPE medio 8.5',
    severity: 'alta' as const,
    tag: 'Volumen',
  },
  {
    id: 'a2',
    student: 'Rocío Medina',
    title: 'Rocío lleva 6 días sin registrar entrenamientos',
    detail: 'Último registro: Día 2 Fuerza y Potencia Inferior · adherencia 41%',
    severity: 'media' as const,
    tag: 'Adherencia',
  },
  {
    id: 'a3',
    student: 'Gonzalo Ferrer',
    title: 'Desbalance empuje / tracción en el mesociclo de Gonzalo',
    detail: '18 series de empuje contra 9 de tracción · ratio 2.0',
    severity: 'media' as const,
    tag: 'Patrones',
  },
]

export const students: Student[] = [
  {
    id: 's1',
    name: 'Pablo Salas',
    initials: 'PS',
    goal: 'Fuerza',
    level: 'Avanzado',
    plan: 'Fuerza Tren Superior · Mesociclo 4',
    nextSession: { label: 'Hoy', day: '18:30', focus: 'Día 1 Fuerza Tren Sup.' },
    adherence: 94,
    status: 'al-dia',
  },
  {
    id: 's2',
    name: 'Juan Peralta',
    initials: 'JP',
    goal: 'Potencia',
    level: 'Intermedio',
    plan: 'Potência, Força e Condicionamento 1',
    nextSession: { label: 'Hoy', day: '19:15', focus: 'Día 2 Fuerza y Pot. Inf.' },
    adherence: 88,
    status: 'atencion',
  },
  {
    id: 's3',
    name: 'Rocío Medina',
    initials: 'RM',
    goal: 'Acondicionamiento',
    level: 'Intermedio',
    plan: 'Preparación Física Karate 12',
    nextSession: { label: 'Atrasado', day: '6 días', focus: 'Día 2 Fuerza y Pot. Inf.' },
    adherence: 41,
    status: 'riesgo',
  },
  {
    id: 's4',
    name: 'Gonzalo Ferrer',
    initials: 'GF',
    goal: 'Hipertrofia',
    level: 'Avanzado',
    plan: 'Rutina por Patrones 3',
    nextSession: { label: 'Mañana', day: '07:00', focus: 'Día 3 Estructura' },
    adherence: 76,
    status: 'atencion',
  },
  {
    id: 's5',
    name: 'Camila Duarte',
    initials: 'CD',
    goal: 'Salud',
    level: 'Inicial',
    plan: 'Movilidad y Fuerza General',
    nextSession: { label: 'Mañana', day: '10:30', focus: 'Día 1 Full Body' },
    adherence: 97,
    status: 'al-dia',
  },
  {
    id: 's6',
    name: 'Martín Ávila',
    initials: 'MA',
    goal: 'Fuerza',
    level: 'Intermedio',
    plan: 'Fuerza Gral + Plio · Mesociclo 2',
    nextSession: { label: 'Jueves', day: '20:00', focus: 'Día 4 Fuerza Gral + Plio' },
    adherence: 82,
    status: 'al-dia',
  },
  {
    id: 's7',
    name: 'Lucía Ferraro',
    initials: 'LF',
    goal: 'Salud',
    level: 'Inicial',
    plan: 'Grupos Musculares · Base',
    nextSession: { label: 'Atrasado', day: '2 días', focus: 'Día 1 Tren Superior' },
    adherence: 58,
    status: 'riesgo',
  },
  {
    id: 's8',
    name: 'Diego Ocampo',
    initials: 'DO',
    goal: 'Acondicionamiento',
    level: 'Avanzado',
    plan: 'Preparación Física Karate 11',
    nextSession: { label: 'Viernes', day: '18:00', focus: 'Día 3 Contraste' },
    adherence: 91,
    status: 'al-dia',
  },
]

export const weeklyVolume = [
  { group: 'Empuje', series: 22, target: 24 },
  { group: 'Tracción', series: 19, target: 22 },
  { group: 'Dom. rodillas', series: 26, target: 20 },
  { group: 'Dom. caderas', series: 14, target: 18 },
  { group: 'Core', series: 11, target: 12 },
]
