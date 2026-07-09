import type { Ficha, Session } from './types'
import { addDays, mondayOf, toLocalISO } from './format'

// Gera histórico de exemplo (opt-in, nunca inserido silenciosamente):
// 8 semanas × 3 treinos (seg/qua/sex), fichas em rodízio, cargas progredindo
// de forma plausível. Passa pelo mesmo caminho de gravação de um treino real.

interface SeedEx {
  lastKg: number
  lastReps: number
  startKg: number
}

const SEED: Record<string, SeedEx> = {
  'Supino Reto': { lastKg: 80, lastReps: 8, startKg: 62.5 },
  'Supino Inclinado Halteres': { lastKg: 30, lastReps: 10, startKg: 22 },
  'Crucifixo na Polia': { lastKg: 20, lastReps: 12, startKg: 14 },
  'Tríceps Corda': { lastKg: 32.5, lastReps: 12, startKg: 25 },
  'Tríceps Francês': { lastKg: 25, lastReps: 10, startKg: 18 },
  'Barra Fixa': { lastKg: 10, lastReps: 8, startKg: 2.5 },
  'Remada Curvada': { lastKg: 70, lastReps: 8, startKg: 55 },
  'Puxada Alta': { lastKg: 65, lastReps: 10, startKg: 50 },
  'Rosca Direta': { lastKg: 32.5, lastReps: 10, startKg: 24 },
  'Rosca Martelo': { lastKg: 14, lastReps: 12, startKg: 10 },
  'Agachamento Livre': { lastKg: 105, lastReps: 6, startKg: 80 },
  'Leg Press': { lastKg: 220, lastReps: 10, startKg: 160 },
  'Cadeira Extensora': { lastKg: 65, lastReps: 12, startKg: 45 },
  'Mesa Flexora': { lastKg: 50, lastReps: 12, startKg: 35 },
  'Panturrilha em Pé': { lastKg: 110, lastReps: 15, startKg: 80 },
  'Desenvolvimento Halteres': { lastKg: 26, lastReps: 8, startKg: 18 },
  'Elevação Lateral': { lastKg: 10, lastReps: 12, startKg: 7 },
  'Elevação Frontal': { lastKg: 9, lastReps: 12, startKg: 6 },
  'Encolhimento': { lastKg: 85, lastReps: 12, startKg: 60 },
  'Abdominal Cabo': { lastKg: 40, lastReps: 15, startKg: 30 },
}

const WEEKS = 8

const DEFAULT_FICHAS: [string, string, string[]][] = [
  ['A', 'Peito e Tríceps', ['Supino Reto', 'Supino Inclinado Halteres', 'Crucifixo na Polia', 'Tríceps Corda', 'Tríceps Francês']],
  ['B', 'Costas e Bíceps', ['Barra Fixa', 'Remada Curvada', 'Puxada Alta', 'Rosca Direta', 'Rosca Martelo']],
  ['C', 'Pernas', ['Agachamento Livre', 'Leg Press', 'Cadeira Extensora', 'Mesa Flexora', 'Panturrilha em Pé']],
  ['D', 'Ombros e Core', ['Desenvolvimento Halteres', 'Elevação Lateral', 'Elevação Frontal', 'Encolhimento', 'Abdominal Cabo']],
]

/** As 4 fichas clássicas — usadas apenas pelo botão "Carregar dados de exemplo". */
export function defaultFichas(): Ficha[] {
  return DEFAULT_FICHAS.map(([letter, grupo, ex], i) => ({
    id: crypto.randomUUID(),
    letter,
    grupo,
    position: i,
    exercises: ex.map((name, j) => ({
      id: crypto.randomUUID(),
      name,
      position: j,
      setsCount: 3,
      technique: '',
    })),
  }))
}

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2
}

export function generateExampleSessions(fichas: Ficha[], now: Date): Session[] {
  if (fichas.length === 0) return []
  const monday = mondayOf(now)
  const sessions: Session[] = []
  let fichaIdx = 0

  for (let w = WEEKS; w >= 1; w--) {
    for (const dayOffset of [0, 2, 4]) {
      const date = addDays(monday, -w * 7 + dayOffset)
      if (date > now) continue
      const ficha = fichas[fichaIdx % fichas.length]
      fichaIdx++
      // progresso 0..1 ao longo das semanas
      const t = (WEEKS - w) / (WEEKS - 1)
      let volume = 0
      const exercises = ficha.exercises.map((fe, pos) => {
        const seed = SEED[fe.name] ?? { lastKg: 20, lastReps: 10, startKg: 10 }
        const kg = roundHalf(seed.startKg + (seed.lastKg - seed.startKg) * t)
        const sets = [0, 1, 2].map((i) => {
          const reps = Math.max(1, seed.lastReps - (i === 2 ? 1 : 0))
          volume += kg * reps
          return { id: crypto.randomUUID(), setNumber: i + 1, kg, reps, repsDetail: '', done: true }
        })
        return { id: crypto.randomUUID(), name: fe.name, note: '', position: pos, technique: '', sets }
      })
      const startedAt = new Date(date)
      startedAt.setHours(18, 30, 0, 0)
      sessions.push({
        id: crypto.randomUUID(),
        date: toLocalISO(date),
        fichaId: ficha.id,
        fichaLetter: ficha.letter,
        grupo: ficha.grupo,
        volume: Math.round(volume),
        durationMin: 48 + ((w * 7 + dayOffset) % 4) * 6,
        startedAt: startedAt.toISOString(),
        exercises,
      })
    }
  }
  return sessions
}
