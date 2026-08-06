import { describe, it, expect } from 'vitest'
import { parseNum, parseReps, e1rm, fmtKg, fmtInt, fmtVolK, mondayOf, addDays, toLocalISO, fmtElapsed } from './format'

describe('parseNum', () => {
  it('converte vírgula decimal pt-BR em ponto', () => {
    expect(parseNum('82,5')).toBe(82.5)
  })
  it('retorna 0 para string vazia', () => {
    expect(parseNum('')).toBe(0)
  })
  it('aceita número já pronto', () => {
    expect(parseNum(82.5)).toBe(82.5)
  })
  it('retorna 0 para texto não numérico', () => {
    expect(parseNum('abc')).toBe(0)
  })
  it('retorna 0 para NaN', () => {
    expect(parseNum(NaN)).toBe(0)
  })
})

describe('parseReps', () => {
  it('reps simples: main = total = valor único', () => {
    expect(parseReps('8')).toEqual({ main: 8, total: 8, blocks: [8] })
  })
  it('notação de técnica soma os blocos e usa o primeiro como main', () => {
    expect(parseReps('6+2/2/2')).toEqual({ main: 6, total: 12, blocks: [6, 2, 2, 2] })
  })
  it('string vazia retorna tudo zerado', () => {
    expect(parseReps('')).toEqual({ main: 0, total: 0, blocks: [] })
  })
})

describe('e1rm', () => {
  it('aplica a fórmula de Epley', () => {
    expect(e1rm(100, 10)).toBeCloseTo(100 * (1 + 10 / 30))
  })
  it('retorna 0 quando kg é 0', () => {
    expect(e1rm(0, 10)).toBe(0)
  })
  it('retorna 0 quando reps é 0', () => {
    expect(e1rm(100, 0)).toBe(0)
  })
})

describe('fmtKg / fmtInt / fmtVolK', () => {
  it('fmtKg formata com até 1 casa decimal em pt-BR', () => {
    expect(fmtKg(82.5)).toBe('82,5')
  })
  it('fmtInt arredonda e formata separador de milhar pt-BR', () => {
    expect(fmtInt(1234.6)).toBe('1.235')
  })
  it('fmtVolK formata em milhares com "k"', () => {
    expect(fmtVolK(12400)).toBe('12,4k')
  })
  it('fmtVolK formata valores abaixo de 1000', () => {
    expect(fmtVolK(500)).toBe('0,5k')
  })
})

describe('mondayOf', () => {
  it('retorna a própria data quando já é segunda-feira', () => {
    const monday = new Date(2026, 0, 5) // segunda-feira
    const result = mondayOf(monday)
    expect(result.getDay()).toBe(1)
    expect(result.getDate()).toBe(5)
  })
  it('domingo volta 6 dias para a segunda anterior', () => {
    const sunday = new Date(2026, 0, 11) // domingo
    const result = mondayOf(sunday)
    expect(result.getDay()).toBe(1)
    expect(result.getDate()).toBe(5)
  })
  it('meio da semana volta para a segunda da mesma semana', () => {
    const wednesday = new Date(2026, 0, 7)
    const result = mondayOf(wednesday)
    expect(result.getDate()).toBe(5)
  })
  it('zera as horas', () => {
    const d = new Date(2026, 0, 7, 15, 30)
    const result = mondayOf(d)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('addDays / toLocalISO', () => {
  it('soma dias dentro do mesmo mês', () => {
    const d = new Date(2026, 0, 5)
    expect(toLocalISO(addDays(d, 3))).toBe('2026-01-08')
  })
  it('vira o mês corretamente', () => {
    const d = new Date(2026, 0, 31)
    expect(toLocalISO(addDays(d, 1))).toBe('2026-02-01')
  })
  it('vira o ano corretamente', () => {
    const d = new Date(2026, 11, 31)
    expect(toLocalISO(addDays(d, 1))).toBe('2027-01-01')
  })
})

describe('fmtElapsed', () => {
  it('formata segundos abaixo de 1 minuto', () => {
    expect(fmtElapsed(45)).toBe('00:45')
  })
  it('formata exatamente 60 segundos como 1 minuto', () => {
    expect(fmtElapsed(60)).toBe('01:00')
  })
  it('aplica padding em minutos e segundos', () => {
    expect(fmtElapsed(65)).toBe('01:05')
  })
})
