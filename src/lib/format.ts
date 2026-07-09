export function parseNum(v: string | number): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  const n = parseFloat(String(v || '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/** e1RM pela fórmula de Epley: kg × (1 + reps/30) */
export function e1rm(kg: number, reps: number): number {
  return kg > 0 && reps > 0 ? kg * (1 + reps / 30) : 0
}

/**
 * Notação de reps com técnica: "6+2/2/2" (Myo Reps, Cluster...) → blocos [6,2,2,2].
 * `main` = primeiro bloco (usado no e1RM); `total` = soma (usado no volume).
 * Reps simples ("8") também passam por aqui: main = total = 8.
 */
export function parseReps(raw: string | number): { main: number; total: number; blocks: number[] } {
  const matches = String(raw ?? '').match(/\d+(?:[.,]\d+)?/g)
  if (!matches || matches.length === 0) return { main: 0, total: 0, blocks: [] }
  const blocks = matches.map((m) => Math.round(parseFloat(m.replace(',', '.'))))
  return { main: blocks[0], total: blocks.reduce((a, b) => a + b, 0), blocks }
}

export function fmtKg(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

/** "12,4k" — volume em milhares */
export function fmtVolK(n: number): string {
  return (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
}

/** "yyyy-mm-dd" → "DD/MM" */
export function fmtDate(iso: string): string {
  const p = iso.split('-')
  return p[2] + '/' + p[1]
}

/** Data local em yyyy-mm-dd (sem surpresas de fuso do toISOString) */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Segunda-feira da semana da data, à meia-noite local */
export function mondayOf(d: Date): Date {
  const m = new Date(d)
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  m.setHours(0, 0, 0, 0)
  return m
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(d.getDate() + days)
  return r
}

export function fmtElapsed(secs: number): string {
  return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0')
}

const DOW = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/** "Segunda-feira, 7 de julho" */
export function todayLabel(now: Date): string {
  return `${DOW[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()].toLowerCase()}`
}

/** "Julho 2026" */
export function monthLabel(now: Date): string {
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'EU'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
