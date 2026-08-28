// Datos de ejemplo para la vista de ejecución del Alumno.
// Los videoId son reales (YouTube), tomados de lib/data/library.ts.

export type StudentSet = {
  targetReps: number
  targetLoad: number
}

export type StudentExercise = {
  id: string
  name: string
  videoId: string | null
  sets: StudentSet[]
}

export type StudentSession = {
  day: string
  exercises: StudentExercise[]
}

export const todaySession: StudentSession = {
  day: 'Día 1: Fuerza A',
  exercises: [
    {
      id: 'ex-1',
      name: 'Sentadilla Goblet',
      videoId: 'E24xqM7xdbc',
      sets: [
        { targetReps: 10, targetLoad: 20 },
        { targetReps: 10, targetLoad: 20 },
        { targetReps: 8, targetLoad: 22 },
      ],
    },
    {
      id: 'ex-2',
      name: 'Peso Muerto Rumano',
      videoId: 'E_aYPX5BBS4',
      sets: [
        { targetReps: 8, targetLoad: 40 },
        { targetReps: 8, targetLoad: 40 },
        { targetReps: 8, targetLoad: 42 },
      ],
    },
    {
      id: 'ex-3',
      name: 'Remo con Mancuerna',
      videoId: 'JdOGwDQ_rsM',
      sets: [
        { targetReps: 12, targetLoad: 16 },
        { targetReps: 12, targetLoad: 16 },
        { targetReps: 10, targetLoad: 18 },
      ],
    },
    {
      id: 'ex-4',
      name: 'Press Banca Inclinado',
      videoId: 'tcw2c5dtqD4',
      sets: [
        { targetReps: 10, targetLoad: 24 },
        { targetReps: 10, targetLoad: 24 },
        { targetReps: 8, targetLoad: 26 },
      ],
    },
  ],
}
