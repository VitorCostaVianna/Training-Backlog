export type Tab = 'inicio' | 'treino' | 'progresso' | 'agenda'

export interface Profile {
  id: string
  displayName: string
  descansoSegundos: number
  descansoAutomatico: boolean
  metaSemanal: number
}

export interface FichaExercise {
  id: string
  name: string
  position: number
  setsCount: number
  technique: string // '' = normal; ex. 'Myo Reps', 'Cluster Set'
}

export interface Ficha {
  id: string
  letter: string
  grupo: string
  position: number
  exercises: FichaExercise[]
}

export interface StoredSet {
  id: string
  setNumber: number
  kg: number
  reps: number // total de repetições (soma dos blocos, se houver técnica)
  repsDetail: string // notação crua quando há técnica, ex. "6+2/2/2"; '' se simples
  done: boolean
}

export interface StoredExercise {
  id: string
  name: string
  note: string
  position: number
  technique: string
  sets: StoredSet[]
}

export interface Session {
  id: string
  date: string // yyyy-mm-dd (local)
  fichaId: string | null
  fichaLetter: string
  grupo: string
  volume: number
  durationMin: number
  startedAt: string
  exercises: StoredExercise[]
}

// Treino em andamento — vive só no dispositivo até ser concluído.
export interface ActiveSet {
  kg: string // texto cru do input (vírgula decimal pt-BR)
  reps: string // aceita notação de técnica: "6+2/2/2"
  done: boolean
}

export interface ActiveExercise {
  name: string
  note: string
  technique: string
  sets: ActiveSet[]
}

export interface ActiveWorkout {
  fichaId: string | null
  fichaLetter: string
  grupo: string
  startTs: number
  exIndex: number
  exercises: ActiveExercise[]
}
