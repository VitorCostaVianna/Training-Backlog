import { describe, it, expect } from 'vitest'
import { buildExerciseStats, streakWeeks, weekSessions, weeklyVolumes } from './stats'
import { e1rm } from './format'
import type { Session, StoredExercise, StoredSet } from './types'

function makeSet(overrides: Partial<StoredSet> = {}): StoredSet {
  return { id: crypto.randomUUID(), setNumber: 1, kg: 0, reps: 0, repsDetail: '', done: false, ...overrides }
}

function makeExercise(name: string, sets: StoredSet[], overrides: Partial<StoredExercise> = {}): StoredExercise {
  return { id: crypto.randomUUID(), name, note: '', position: 0, technique: '', sets, ...overrides }
}

function makeSession(date: string, exercises: StoredExercise[], overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    date,
    fichaId: null,
    fichaLetter: 'A',
    grupo: 'Peito',
    volume: 0,
    durationMin: 40,
    startedAt: `${date}T12:00:00.000Z`,
    exercises,
    ...overrides,
  }
}

describe('weekSessions', () => {
  const now = new Date(2026, 0, 7) // quarta-feira, semana de 05 a 11/01/2026

  it('exclui sessão da semana anterior', () => {
    const prev = makeSession('2026-01-04', [])
    expect(weekSessions([prev], now)).toEqual([])
  })

  it('inclui sessão de segunda-feira da semana atual', () => {
    const mon = makeSession('2026-01-05', [])
    expect(weekSessions([mon], now)).toEqual([mon])
  })

  it('inclui sessão de hoje', () => {
    const today = makeSession('2026-01-07', [])
    expect(weekSessions([today], now)).toEqual([today])
  })
})

describe('weeklyVolumes', () => {
  it('soma o volume por semana, da mais antiga à atual', () => {
    const now = new Date(2026, 0, 7) // semana atual: 05 a 11/01/2026
    const older = makeSession('2026-01-02', [], { volume: 100 }) // semana anterior: 29/12 a 04/01
    const current = makeSession('2026-01-06', [], { volume: 200 })
    expect(weeklyVolumes([older, current], now, 2)).toEqual([100, 200])
  })

  it('semana sem nenhuma sessão soma 0', () => {
    const now = new Date(2026, 0, 7)
    expect(weeklyVolumes([], now, 3)).toEqual([0, 0, 0])
  })
})

describe('streakWeeks', () => {
  it('retorna 0 sem nenhuma sessão', () => {
    expect(streakWeeks([], new Date(2026, 0, 21))).toBe(0)
  })

  it('semana atual sem treino ainda não quebra a sequência', () => {
    const now = new Date(2026, 0, 21) // semana atual: 19 a 25/01, sem sessão
    const sessions = [
      makeSession('2026-01-13', []), // semana anterior: 12 a 18/01
      makeSession('2026-01-06', []), // duas semanas atrás: 05 a 11/01
    ]
    expect(streakWeeks(sessions, now)).toBe(2)
  })

  it('quebra a sequência numa semana sem treino', () => {
    const now = new Date(2026, 0, 21) // semana atual: 19 a 25/01
    const sessions = [
      makeSession('2026-01-20', []), // semana atual: tem treino
      // semana anterior (12 a 18/01) sem sessão -> quebra aqui
      makeSession('2026-01-06', []), // não deveria contar, sequência já quebrou antes
    ]
    expect(streakWeeks(sessions, now)).toBe(1)
  })
})

describe('buildExerciseStats', () => {
  const now = new Date(2026, 0, 21) // semana atual: 19 a 25/01/2026

  it('PR é o maior kg entre séries feitas, ignorando não-feitas e kg/reps inválidos', () => {
    const sessions = [
      makeSession('2026-01-05', [makeExercise('Supino Reto', [makeSet({ kg: 80, reps: 8, done: true })])]),
      makeSession('2026-01-12', [makeExercise('Supino Reto', [makeSet({ kg: 85, reps: 6, done: true })])]),
      makeSession('2026-01-19', [
        makeExercise('Supino Reto', [
          makeSet({ kg: 82, reps: 10, done: true }),
          makeSet({ kg: 999, reps: 1, done: false }), // não feita, deve ser ignorada
          makeSet({ kg: 0, reps: 5, done: true }), // kg zero, deve ser ignorada
        ]),
      ]),
    ]
    const stats = buildExerciseStats(sessions, now)
    const s = stats.get('Supino Reto')!
    expect(s.pr).toBe(85)
    expect(s.prDate).toBe('2026-01-12')
  })

  it('"último" reflete a sessão mais recente por data, não a última do array', () => {
    const sessions = [
      makeSession('2026-01-19', [makeExercise('Supino Reto', [makeSet({ kg: 82, reps: 10, done: true })])]),
      makeSession('2026-01-05', [makeExercise('Supino Reto', [makeSet({ kg: 80, reps: 8, done: true })])]),
    ]
    const stats = buildExerciseStats(sessions, now)
    const s = stats.get('Supino Reto')!
    expect(s.lastKg).toBe(82)
    expect(s.lastReps).toBe(10)
  })

  it('histórico de e1RM faz carry-forward e preenche semanas anteriores ao primeiro dado', () => {
    const sessions = [
      makeSession('2026-01-05', [makeExercise('Supino Reto', [makeSet({ kg: 80, reps: 8, done: true })])]), // 2 semanas atrás
      makeSession('2026-01-12', [makeExercise('Supino Reto', [makeSet({ kg: 85, reps: 6, done: true })])]), // 1 semana atrás
      makeSession('2026-01-19', [makeExercise('Supino Reto', [makeSet({ kg: 82, reps: 10, done: true })])]), // semana atual
    ]
    const stats = buildExerciseStats(sessions, now)
    const hist = stats.get('Supino Reto')!.e1rmHist
    expect(hist).toHaveLength(10)
    const oldVal = Math.round(e1rm(80, 8) * 10) / 10
    const midVal = Math.round(e1rm(85, 6) * 10) / 10
    const curVal = Math.round(e1rm(82, 10) * 10) / 10
    // semanas sem dado, antes do primeiro treino, ficam com o valor do primeiro treino conhecido
    expect(hist[0]).toBe(oldVal)
    expect(hist[6]).toBe(oldVal)
    expect(hist[7]).toBe(oldVal)
    expect(hist[8]).toBe(midVal)
    expect(hist[9]).toBe(curVal)
  })

  it('com notação de técnica, o e1RM usa só o bloco principal (não o total)', () => {
    const sessions = [
      makeSession('2026-01-19', [
        makeExercise('Rosca Direta', [makeSet({ kg: 100, reps: 8, repsDetail: '6+2', done: true })]),
      ]),
    ]
    const stats = buildExerciseStats(sessions, now)
    const hist = stats.get('Rosca Direta')!.e1rmHist
    const expected = Math.round(e1rm(100, 6) * 10) / 10 // main = 6, não 8 (total do repsDetail)
    expect(hist[9]).toBe(expected)
  })
})
