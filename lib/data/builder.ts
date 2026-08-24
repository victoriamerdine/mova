export type LibraryExercise = {
  id: string
  name: string
  muscles: string[]
}

export const exerciseLibrary: LibraryExercise[] = [
  { id: 'lib-1', name: 'Peso Muerto Rumano', muscles: ['Isquios', 'Glúteo'] },
  { id: 'lib-2', name: 'Sentadilla Goblet', muscles: ['Cuádriceps', 'Glúteo'] },
  { id: 'lib-3', name: 'Remo con mancuerna', muscles: ['Dorsal', 'Bíceps'] },
  { id: 'lib-4', name: 'Press banca inclinado', muscles: ['Pectoral', 'Tríceps'] },
  { id: 'lib-5', name: 'Dominadas supinas', muscles: ['Dorsal', 'Bíceps'] },
  { id: 'lib-6', name: 'Press militar mancuerna', muscles: ['Hombro', 'Tríceps'] },
  { id: 'lib-7', name: 'Zancada caminando', muscles: ['Cuádriceps', 'Glúteo'] },
  { id: 'lib-8', name: 'Curl femoral en banco', muscles: ['Isquios'] },
  { id: 'lib-9', name: 'Face pull en polea', muscles: ['Deltoide post.'] },
  { id: 'lib-10', name: 'Hip thrust con barra', muscles: ['Glúteo'] },
  { id: 'lib-11', name: 'Elevaciones laterales', muscles: ['Hombro'] },
  { id: 'lib-12', name: 'Curl bíceps barra Z', muscles: ['Bíceps'] },
  { id: 'lib-13', name: 'Fondos en paralelas', muscles: ['Pectoral', 'Tríceps'] },
  { id: 'lib-14', name: 'Plancha con carga', muscles: ['Core'] },
]

export type IndividualBlock = {
  id: string
  kind: 'individual'
  exercise: string
  sets: number
  reps: number
  load: number
  rest: number
}

export type SupersetExercise = {
  id: string
  label: string
  exercise: string
  sets: number
  reps: number
}

export type SupersetBlock = {
  id: string
  kind: 'superset'
  rounds: number
  rest: number
  exercises: SupersetExercise[]
}

export type WorkoutBlock = IndividualBlock | SupersetBlock

export const initialBlocks: WorkoutBlock[] = [
  {
    id: 'block-1',
    kind: 'individual',
    exercise: 'Peso Muerto Rumano',
    sets: 3,
    reps: 8,
    load: 40,
    rest: 90,
  },
  {
    id: 'block-2',
    kind: 'superset',
    rounds: 3,
    rest: 60,
    exercises: [
      { id: 'block-2-a1', label: 'A1', exercise: 'Sentadilla Goblet', sets: 3, reps: 12 },
      { id: 'block-2-a2', label: 'A2', exercise: 'Remo con mancuerna', sets: 3, reps: 12 },
    ],
  },
]
