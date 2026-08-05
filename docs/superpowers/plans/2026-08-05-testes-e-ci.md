# Testes automatizados (Vitest) + pipeline de CI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar testes unitários (Vitest) para as funções puras de `src/lib/format.ts` e `src/lib/stats.ts`, e uma pipeline de CI (GitHub Actions) que rode testes + type-check + build em todo push e pull request.

**Architecture:** Vitest roda sobre a config Vite existente (sem transpiler adicional). Testes ficam colocados ao lado do código-fonte (`*.test.ts`), sem mocks — só funções puras com fixtures construídas manualmente. A CI é um único workflow com um único job que reproduz localmente os mesmos três comandos: `npm run test`, `tsc --noEmit`, `npm run build`.

**Tech Stack:** Vitest (novo), GitHub Actions, Node 22 (versão do ambiente de dev atual — sem `.nvmrc` no repo).

## Global Constraints

- Nenhum mock de Supabase/localStorage/DOM — todos os testes deste plano cobrem funções puras (`src/lib/format.ts`, `src/lib/stats.ts`), fora de escopo: `AppState.tsx`, `db.ts`, componentes React.
- Datas em testes são sempre construídas explicitamente (`new Date(2026, 0, 21)`), nunca `new Date()` sem argumento — evita testes dependentes do dia em que rodam.
- CI dispara em `push` e `pull_request`, sem branch protection / required check — só reporta ✓/✗, não bloqueia merge.
- `git push` para o GitHub **não** faz parte de nenhum passo automático deste plano — é uma ação visível a terceiros e precisa de confirmação explícita do usuário antes de ser executada, feita separadamente ao final.

---

### Task 1: Instalar e configurar Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: comando `npm run test` (roda Vitest uma vez, modo CI) e `npm run test:watch` (modo watch local), usados pela Task 4 (workflow de CI) e por qualquer execução manual.

- [ ] **Step 1: Instalar a dependência**

Run: `npm install -D vitest`

Isso adiciona `vitest` a `devDependencies` em `package.json` e atualiza `package-lock.json` automaticamente — não escreva a versão manualmente.

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

Ambiente `node` (não `jsdom`) porque só vamos testar funções puras, sem DOM.

- [ ] **Step 3: Adicionar scripts ao `package.json`**

No bloco `"scripts"` existente, adicione as duas linhas abaixo (mantendo `dev`, `build`, `preview` como estão):

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

O resultado final do bloco `"scripts"` deve ficar:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 4: Validar que a config carrega sem nenhum teste ainda**

Run: `npx vitest run --passWithNoTests`

Expected: saída indicando "No test files found" (ou equivalente) e exit code 0 — confirma que o Vitest está instalado e a config é válida, antes de escrever qualquer teste.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: adiciona Vitest (setup + scripts, sem testes ainda)"
```

---

### Task 2: Testes de `src/lib/format.ts`

**Files:**
- Create: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: `parseNum`, `parseReps`, `e1rm`, `fmtKg`, `fmtInt`, `fmtVolK`, `mondayOf`, `addDays`, `toLocalISO`, `fmtElapsed` de `./format` (já implementadas, sem alterações neste plano).

- [ ] **Step 1: Escrever `src/lib/format.test.ts`**

```ts
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
```

- [ ] **Step 2: Rodar os testes**

Run: `npx vitest run src/lib/format.test.ts`
Expected: todos os testes em verde (PASS).

- [ ] **Step 3: Commit**

```bash
git add src/lib/format.test.ts
git commit -m "test: cobre format.ts (parseNum, parseReps, e1rm, formatadores pt-BR, datas)"
```

---

### Task 3: Testes de `src/lib/stats.ts`

**Files:**
- Create: `src/lib/stats.test.ts`

**Interfaces:**
- Consumes: `buildExerciseStats`, `streakWeeks`, `weekSessions`, `weeklyVolumes` de `./stats`; `e1rm` de `./format` (usado só para calcular o valor esperado nas asserções); tipos `Session`, `StoredExercise`, `StoredSet` de `./types` (todos já implementados, sem alterações neste plano).

- [ ] **Step 1: Escrever `src/lib/stats.test.ts`**

```ts
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
```

- [ ] **Step 2: Rodar os testes**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: todos os testes em verde (PASS).

- [ ] **Step 3: Rodar a suíte inteira**

Run: `npm run test`
Expected: todos os testes de `format.test.ts` e `stats.test.ts` em verde.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stats.test.ts
git commit -m "test: cobre stats.ts (PR, último, streak, volume semanal, carry-forward do e1RM)"
```

---

### Task 4: Pipeline de CI (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run test` (Task 1), `npm run build` (já existente em `package.json`, roda `tsc --noEmit && vite build`).

- [ ] **Step 1: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Type-check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Validar localmente os mesmos comandos que a CI vai rodar**

Não dá pra rodar o Actions runner localmente, então valide cada comando do workflow manualmente, na ordem:

Run: `npm run test`
Expected: PASS (todos os testes das Tasks 2 e 3 em verde).

Run: `npx tsc --noEmit`
Expected: sem erros de tipo (exit code 0).

Run: `npm run build`
Expected: build do Vite conclui sem erro (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: adiciona workflow do GitHub Actions (test + type-check + build)"
```

- [ ] **Step 4: Push (requer confirmação explícita do usuário)**

Este workflow só aparece no GitHub — e só é validado de verdade — depois que os commits chegam ao repositório remoto. **Não rode `git push` automaticamente.** Ao final da Task 4, pergunte ao usuário se ele quer que os commits desta sessão sejam enviados agora (`git push`), já que é uma ação que afeta o repositório compartilhado no GitHub.

---

## Self-Review

**Cobertura da spec:** todos os casos de teste listados na seção "Casos de teste" da spec (`docs/superpowers/specs/2026-08-05-testes-e-ci-design.md`) têm um teste correspondente nas Tasks 2 e 3. O workflow da Task 4 reproduz exatamente os 6 passos descritos na seção "Pipeline de CI" da spec (checkout, setup-node 22, npm ci, npm run test, tsc --noEmit, npm run build), disparado em `push` e `pull_request`, sem branch protection — conforme decidido.

**Placeholders:** nenhum "TBD"/"depois eu vejo" — todo código de teste e do workflow está escrito por extenso, pronto para copiar.

**Consistência de tipos:** os nomes de campos usados nos helpers `makeSet`/`makeExercise`/`makeSession` da Task 3 (`kg`, `reps`, `repsDetail`, `done`, `fichaLetter`, `grupo`, `volume`, `durationMin`, `startedAt`, `exercises`) batem exatamente com as interfaces `StoredSet`, `StoredExercise` e `Session` de `src/lib/types.ts`. Os nomes de função importados (`buildExerciseStats`, `streakWeeks`, `weekSessions`, `weeklyVolumes`, `e1rm`) batem com as assinaturas reais lidas de `src/lib/stats.ts` e `src/lib/format.ts`.
