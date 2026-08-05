# Testes automatizados (Vitest) + pipeline de CI — design

Data: 2026-08-05

## Contexto

O app (`backlog-treino`) é um PWA React/Vite/TypeScript com Supabase, offline-first,
já em produção (deploy automático via Vercel + GitHub). Hoje não há nenhum teste
automatizado nem CI — a única validação antes do deploy é `tsc --noEmit` rodando
localmente como parte de `npm run build`.

O código com lógica mais sensível a bug silencioso é `src/lib/format.ts` e
`src/lib/stats.ts`: cálculo de e1RM, PR, streak, volume semanal, parsing de
kg/reps em notação pt-BR (vírgula decimal) e notação de técnica ("6+2/2/2").
São todas funções puras, sem I/O — o alvo ideal para testes unitários de alto
valor e baixo custo.

## Objetivo

1. Adicionar testes unitários para as funções puras de `format.ts` e `stats.ts`.
2. Montar uma pipeline de CI no GitHub Actions que rode type-check, testes e
   build em todo push e pull request, como validação informativa (sem bloquear
   merge/deploy por enquanto).

## Fora de escopo

- Testes de `AppState.tsx` (lógica de merge/outbox offline), `db.ts` (mapeamento
  Supabase) e testes de componentes React. Podem virar um spec futuro.
- Branch protection / gate obrigatório de CI antes de merge.
- Cobertura mínima obrigatória (`--coverage` com threshold).

## Escolha do test runner: Vitest

O projeto já roda em Vite. Vitest reaproveita o mesmo motor (esbuild) e não
exige nenhuma configuração de transpilação adicional, ao contrário de Jest
(que precisaria de `ts-jest` ou Babel rodando em paralelo ao Vite). API
compatível com Jest (`describe`/`it`/`expect`), watch mode integrado.

## Estrutura de arquivos

Testes colocados ao lado do código-fonte (convenção padrão do Vitest):

```
src/lib/format.ts
src/lib/format.test.ts
src/lib/stats.ts
src/lib/stats.test.ts
vitest.config.ts
.github/workflows/ci.yml
```

## Setup técnico

- `vitest` como devDependency (única dependência nova).
- `vitest.config.ts` próprio, ambiente `node` (não precisa de jsdom — são
  funções puras, sem DOM).
- `package.json`:
  - `"test": "vitest run"` — modo CI, roda uma vez e sai.
  - `"test:watch": "vitest"` — uso local em desenvolvimento.
- Imports explícitos de `describe`/`it`/`expect` de `'vitest'` em cada arquivo
  de teste (sem globals configurados) — mais explícito, sem tocar no
  `tsconfig.json`.

## Casos de teste

### `format.test.ts`
- `parseNum`: vírgula decimal ("82,5" → 82.5), string vazia (→ 0), valor
  numérico já pronto, `NaN`/lixo (→ 0).
- `parseReps`: reps simples ("8" → main=8, total=8, blocks=[8]), notação de
  técnica ("6+2/2/2" → main=6, total=12, blocks=[6,2,2,2]), string vazia
  (→ main=0, total=0, blocks=[]).
- `e1rm`: fórmula de Epley com valores válidos, kg=0 (→ 0), reps=0 (→ 0).
- `fmtKg` / `fmtInt` / `fmtVolK`: formatação pt-BR (separador de milhar,
  decimal), `fmtVolK` com valores abaixo de 1000 (ex. "0,5k").
- `mondayOf`: data que já é segunda, domingo (deve voltar 6 dias, não 0),
  meio da semana.
- `addDays` / `toLocalISO`: virada de mês e de ano (ex. 31/12 + 1 dia).
- `fmtElapsed`: segundos < 60, exatos 60, valores com padding ("05:03").

### `stats.test.ts`
- `weekSessions`: sessão antes da segunda-feira atual fica de fora; sessão
  no intervalo entra.
- `weeklyVolumes`: soma de volume por semana ao longo de N semanas, semana
  sem sessão retorna 0.
- `streakWeeks`: sequência quebrada por semana sem treino; semana atual sem
  treino ainda não quebra a sequência (regra explícita no código-fonte);
  sequência de múltiplas semanas consecutivas.
- `buildExerciseStats`:
  - PR é o maior kg de qualquer série feita (`done: true`), ignora séries
    não feitas (`done: false`) e séries com kg/reps ≤ 0.
  - "Último" (`lastKg`/`lastReps`) reflete a sessão mais recente por data,
    não a última inserida no array.
  - Histórico de e1RM (`e1rmHist`) faz carry-forward em semanas sem dado e
    preenche semanas anteriores ao primeiro dado com o primeiro valor
    conhecido (evita gráfico "crescendo do zero").
  - Notação de técnica: e1RM usa `repsDetail` (bloco principal), não o
    `reps` total.

## Pipeline de CI

Arquivo `.github/workflows/ci.yml`:

- Gatilho: `push` e `pull_request` em qualquer branch.
- Um único job (`test`), rodando em `ubuntu-latest`:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` com Node 22 (versão do ambiente de dev atual;
     sem `.nvmrc` no repo hoje) e cache de `npm`.
  3. `npm ci`
  4. `npm run test` (Vitest, modo run-once)
  5. `tsc --noEmit` (mesmo type-check que já roda em `npm run build`)
  6. `npm run build` (garante que o bundle Vite fecha de ponta a ponta)
- Sem branch protection / required check — o workflow só reporta ✓/✗ no
  commit e no PR. Ativar isso depois é uma mudança de configuração do
  repositório, não deste spec.

## Tratamento de erros / edge cases

- Testes de data (`mondayOf`, `addDays`, `streakWeeks`, `weeklyVolumes`)
  usam datas fixas construídas explicitamente no teste (`new Date(2026, 0, 15)`
  etc.) — nunca `new Date()` sem argumento, pra não ter teste dependente do
  dia em que roda.
- `buildExerciseStats` é testado com sessões construídas manualmente
  (fixtures pequenas inline no teste, sem depender de `exampleData.ts`, que
  gera dados aleatórios/relativos a "hoje").

## Critério de sucesso

- `npm run test` roda localmente e passa.
- Push de um commit (ou abertura de PR) no GitHub dispara o workflow e
  mostra o resultado no commit/PR.
- Quebrar deliberadamente uma função (ex. trocar `>` por `>=` no cálculo de
  PR) faz o teste correspondente falhar — confirma que os testes realmente
  pegam regressão, não são só "passar por passar".
