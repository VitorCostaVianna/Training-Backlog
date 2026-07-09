import type { Session } from './types'
import { e1rm, mondayOf, addDays, parseReps, toLocalISO } from './format'

export interface ExerciseStats {
  pr: number // maior kg em série feita
  prDate: string | null
  lastKg: number // melhor série feita do treino mais recente com o exercício
  lastReps: number
  lastRepsText: string // notação crua ("6+2/2/2") ou o número simples
  e1rmHist: number[] // 10 semanas, da mais antiga à atual (carry-forward em semanas sem dado)
  maxE1rm: number
}

const HIST_WEEKS = 10

/** Deriva PR, último kg×reps e histórico de e1RM por exercício a partir das sessões reais. */
export function buildExerciseStats(sessions: Session[], now: Date): Map<string, ExerciseStats> {
  const monday = mondayOf(now)
  const stats = new Map<string, ExerciseStats>()
  const lastSessionDate = new Map<string, string>()
  // e1RM máximo por (exercício, índice de semana 0 = atual)
  const weekMax = new Map<string, Map<number, number>>()

  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date))
  for (const sess of sorted) {
    const sessMonday = mondayOf(new Date(sess.date + 'T12:00:00'))
    const weekIdx = Math.round((monday.getTime() - sessMonday.getTime()) / (7 * 24 * 3600 * 1000))
    for (const ex of sess.exercises) {
      let best: { kg: number; reps: number; repsText: string } | null = null
      for (const set of ex.sets) {
        if (!set.done || set.kg <= 0 || set.reps <= 0) continue
        // Com técnica (ex. "6+2/2/2"), o e1RM considera só o bloco principal.
        const mainReps = set.repsDetail ? parseReps(set.repsDetail).main : set.reps
        const repsText = set.repsDetail || String(set.reps)
        if (!best || set.kg > best.kg) best = { kg: set.kg, reps: mainReps, repsText }
        const s =
          stats.get(ex.name) ??
          { pr: 0, prDate: null, lastKg: 0, lastReps: 0, lastRepsText: '', e1rmHist: [], maxE1rm: 0 }
        if (set.kg > s.pr) {
          s.pr = set.kg
          s.prDate = sess.date
        }
        stats.set(ex.name, s)
        if (weekIdx >= 0 && weekIdx < HIST_WEEKS) {
          let wm = weekMax.get(ex.name)
          if (!wm) weekMax.set(ex.name, (wm = new Map()))
          wm.set(weekIdx, Math.max(wm.get(weekIdx) ?? 0, e1rm(set.kg, mainReps)))
        }
      }
      if (best) {
        const prev = lastSessionDate.get(ex.name)
        if (!prev || sess.date >= prev) {
          lastSessionDate.set(ex.name, sess.date)
          const s = stats.get(ex.name)!
          s.lastKg = best.kg
          s.lastReps = best.reps
          s.lastRepsText = best.repsText
        }
      }
    }
  }

  for (const [name, s] of stats) {
    const wm = weekMax.get(name) ?? new Map<number, number>()
    const hist: number[] = []
    let carry = 0
    for (let w = HIST_WEEKS - 1; w >= 0; w--) {
      const v = wm.get(w)
      if (v !== undefined) carry = v
      hist.push(Math.round(carry * 10) / 10)
    }
    // Semanas anteriores ao primeiro dado ficam com o primeiro valor conhecido,
    // para o delta do gráfico refletir o crescimento real e não "desde zero".
    const firstIdx = hist.findIndex((v) => v > 0)
    if (firstIdx > 0) for (let i = 0; i < firstIdx; i++) hist[i] = hist[firstIdx]
    s.e1rmHist = hist
    s.maxE1rm = Math.max(...hist, 0)
  }

  return stats
}

/** Sessões da semana atual (segunda em diante) */
export function weekSessions(sessions: Session[], now: Date): Session[] {
  const mondayIso = toLocalISO(mondayOf(now))
  return sessions.filter((s) => s.date >= mondayIso)
}

/** Volume total das últimas N semanas, da mais antiga à atual */
export function weeklyVolumes(sessions: Session[], now: Date, weeks = 4): number[] {
  const monday = mondayOf(now)
  const out: number[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const ws = toLocalISO(addDays(monday, -w * 7))
    const we = toLocalISO(addDays(monday, -w * 7 + 7))
    out.push(sessions.filter((s) => s.date >= ws && s.date < we).reduce((acc, s) => acc + s.volume, 0))
  }
  return out
}

/** Semanas consecutivas com ≥1 treino; a semana atual conta se tiver treino, mas não quebra a sequência. */
export function streakWeeks(sessions: Session[], now: Date): number {
  const monday = mondayOf(now)
  let streak = 0
  for (let w = 0; w < 104; w++) {
    const ws = toLocalISO(addDays(monday, -w * 7))
    const we = toLocalISO(addDays(monday, -w * 7 + 7))
    const count = sessions.filter((s) => s.date >= ws && s.date < we).length
    if (count > 0) streak++
    else if (w > 0) break
  }
  return streak
}
