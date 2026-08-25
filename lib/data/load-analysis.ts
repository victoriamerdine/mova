export type LoadRow = {
  name: string
  series: number
}

export type WeeklyLoad = {
  week: string
  rpeTarget: number
  patterns: LoadRow[]
  muscles: LoadRow[]
}

export const WARNING_THRESHOLD = 20
export const DANGER_THRESHOLD = 24

export const weeklyLoad: WeeklyLoad[] = [
  {
    week: 'Semana 1',
    rpeTarget: 7,
    patterns: [
      { name: 'Empuje', series: 14 },
      { name: 'Tracción', series: 12 },
      { name: 'Dominante de Rodilla', series: 16 },
      { name: 'Dominante de Cadera', series: 13 },
    ],
    muscles: [
      { name: 'Pecho', series: 9 },
      { name: 'Espalda', series: 11 },
      { name: 'Hombros', series: 8 },
      { name: 'Bíceps', series: 6 },
      { name: 'Tríceps', series: 7 },
      { name: 'Cuádriceps', series: 12 },
      { name: 'Isquios', series: 9 },
      { name: 'Glúteos', series: 10 },
      { name: 'Core', series: 8 },
    ],
  },
  {
    week: 'Semana 2',
    rpeTarget: 8,
    patterns: [
      { name: 'Empuje', series: 17 },
      { name: 'Tracción', series: 15 },
      { name: 'Dominante de Rodilla', series: 19 },
      { name: 'Dominante de Cadera', series: 16 },
    ],
    muscles: [
      { name: 'Pecho', series: 11 },
      { name: 'Espalda', series: 13 },
      { name: 'Hombros', series: 10 },
      { name: 'Bíceps', series: 8 },
      { name: 'Tríceps', series: 9 },
      { name: 'Cuádriceps', series: 15 },
      { name: 'Isquios', series: 11 },
      { name: 'Glúteos', series: 13 },
      { name: 'Core', series: 10 },
    ],
  },
  {
    week: 'Semana 3',
    rpeTarget: 8,
    patterns: [
      { name: 'Empuje', series: 21 },
      { name: 'Tracción', series: 18 },
      { name: 'Dominante de Rodilla', series: 22 },
      { name: 'Dominante de Cadera', series: 19 },
    ],
    muscles: [
      { name: 'Pecho', series: 14 },
      { name: 'Espalda', series: 16 },
      { name: 'Hombros', series: 12 },
      { name: 'Bíceps', series: 9 },
      { name: 'Tríceps', series: 11 },
      { name: 'Cuádriceps', series: 18 },
      { name: 'Isquios', series: 13 },
      { name: 'Glúteos', series: 16 },
      { name: 'Core', series: 12 },
    ],
  },
  {
    week: 'Semana 4 · Descarga',
    rpeTarget: 6,
    patterns: [
      { name: 'Empuje', series: 26 },
      { name: 'Tracción', series: 10 },
      { name: 'Dominante de Rodilla', series: 9 },
      { name: 'Dominante de Cadera', series: 25 },
    ],
    muscles: [
      { name: 'Pecho', series: 17 },
      { name: 'Espalda', series: 8 },
      { name: 'Hombros', series: 7 },
      { name: 'Bíceps', series: 5 },
      { name: 'Tríceps', series: 6 },
      { name: 'Cuádriceps', series: 7 },
      { name: 'Isquios', series: 6 },
      { name: 'Glúteos', series: 21 },
      { name: 'Core', series: 6 },
    ],
  },
]
