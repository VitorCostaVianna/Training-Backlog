# Handoff: Backlog de Treino (app de registro de treinos de musculação)

## Overview
App mobile-first (pt-BR) para registrar treinos de musculação e acompanhar progressão. Quatro telas em navegação por abas: **Início** (stats da semana + fichas + histórico recente), **Treino** (registro de treino em andamento), **Progresso** (gráfico e1RM, volume semanal, PRs) e **Agenda** (calendário de frequência + histórico).

## About the Design Files
O arquivo `Treino App.dc.html` neste pacote é uma **referência de design criada em HTML** — um protótipo funcional que mostra a aparência e o comportamento pretendidos. **Não é código de produção.** A tarefa é **recriar este design no ambiente do app alvo** (React Native, Flutter, Swift, PWA em React, etc.) usando os padrões e bibliotecas do projeto — ou, se não existir codebase ainda, escolher o framework mais adequado (para uso na academia, um PWA mobile ou React Native é recomendado) e implementar lá.

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamentos e interações são finais — recriar fielmente.

## Design Tokens
Cores:
- Fundo página: `#050607`; fundo app: `#0c0d0f`
- Superfície 1 (cards): `#15171a`; superfície 2 (chips/botões neutros): `#1a1c1f`
- Card de lista (histórico): `#101214` com borda `#1c1f23`
- Bordas: `#1c1f23` (sutil), `#24272b` (inputs), `#2a2d31` (tracejadas), `#3a3e43` (outline de check)
- Texto: primário `#f2f3f0`, secundário `#8a8f95`, terciário/desabilitado `#5c6167`, apagado `#3a3e43`
- Acento: `#c8f04a` (verde-lima) — botões primários, valores-chave, dias treinados, aba ativa; texto sobre acento: `#0c0d0f`
- Acento secundário (e1RM): `#6aa5ff`
- Barra do gráfico (recente): `#5a6b28`; (antiga): `#24272b`

Tipografia:
- Display/UI: **Archivo** (400–900). Títulos de tela: 26px/800; nome do exercício: 21px/800; títulos de card: 16px/700
- Números e labels técnicos: **IBM Plex Mono** (400–700). Timer: 21px/600; valores de stat: 20–22px/600; labels de seção: 11px, letter-spacing .12em, uppercase, cor `#8a8f95`; micro-labels: 9–10px, letter-spacing .1em, uppercase

Raio de borda: cards 16px; cards de lista/linhas de série 14px; inputs 9px; botões de check 11px; badges de ficha 13px; stat cards 12–14px; chips/pills 999px.

Espaçamento: padding de tela 22px 20px; gap entre seções 18–22px; gap interno de card 12–16px; padding-bottom do app 76px (espaço da tab bar).

## Screens / Views

### 1. Início
- Header: label do dia (mono 10px uppercase, ex. "Segunda-feira, 7 de julho") + título "Backlog de Treino" (26px/800); à direita avatar 40×40, raio 12px, fundo `#1a1c1f`, iniciais em mono lima.
- Linha de 3 stat cards (grid 1fr 1fr 1fr, gap 8px, fundo `#15171a`, raio 14px, padding 12px): **Semana** `N/meta` (N em lima), **Volume sem.** (ex. "12,4k kg"), **Sequência** ("N sem").
- Seção **Fichas**: 4 cards (A–D). Cada card: badge 44×44 (fundo `#0c0d0f`, borda `#2a2d31`, letra da ficha em mono lima 17px/700), nome do grupo (16px/700), subtítulo mono 11px "5 exercícios · último DD/MM" (ou "nunca feito"), botão **Iniciar** (fundo lima, texto `#0c0d0f` 13px/800, raio 12px, padding 11px 16px).
- Seção **Últimos treinos**: linhas com data (mono 11px lima, largura 52px), título "Treino A · Peito e Tríceps" (14px/600), e "vol kg · Nmin" (mono 11px cinza).

### 2. Treino (em andamento)
- Header: botão ✕ (36×36, fundo `#1a1c1f`) — abandona com confirmação; centro: label da ficha (mono 10px uppercase lima) + cronômetro mm:ss (mono 21px/600); botão ✓ (36×36, fundo lima) — conclui e salva.
- Linha de chips de exercícios (scroll horizontal, scrollbar oculta): "1 Supino Reto", ativo = fundo lima/texto escuro; concluído (todas séries feitas) = texto lima; demais cinza. Nomes >14 chars truncados com "…".
- Cabeçalho do exercício: nome (21px/800) + posição "2/5 exercícios" (mono 11px). Chips informativos (pill, `white-space:nowrap`): `PR: 82,5 kg` (texto lima), `Último: 80 × 8`, `Vol: 1.520 kg`; badge **NOVO PR** (fundo lima, animação pulse 1.6s) quando kg de série feita > PR.
- Tabela de séries — header em mono 9px uppercase: Set / kg / reps / e1RM / (check). Cada linha: grid `30px 1fr 1fr 54px 42px`, gap 8px, raio 14px:
  - Pendente: fundo `#1a1c1f`, borda `#24272b`
  - Concluída: fundo `#15171a`, opacity .55
  - Inputs kg/reps: fundo `#0c0d0f`, borda `#24272b`, raio 9px, mono 17px/600 centralizado, `inputMode` decimal/numeric; foco = borda lima. Aceitar vírgula decimal (pt-BR).
  - e1RM: fórmula Epley `kg × (1 + reps/30)`, mono 12px azul `#6aa5ff`, "—" se vazio
  - Check: 38×38, raio 11px; feito = fundo lima; pendente = outline `#3a3e43`
- Botões "+ Série" (duplica kg/reps da última) e "−" (remove última, mínimo 1), borda tracejada `#2a2d31`.
- Textarea de nota do exercício (fundo `#15171a`, raio 14px, 13px).
- Rodapé: botão **Descanso Ns** (lima, 15px/800, raio 14px) + botão "→" (56px, `#1a1c1f`) próximo exercício.
- Sem treino ativo: estado vazio ("Nenhum treino em andamento") + lista de fichas com Iniciar.

### 3. Progresso
- Chips seletores de exercício (scroll horizontal, mesmo estilo dos chips do treino).
- Card do gráfico: label "e1RM · 10 semanas" + delta "+17,5 kg ↗" (lima). 10 barras (flex, gap 5px, altura container 110px, raio 4px 4px 0 0): última = lima, 2 anteriores = `#5a6b28`, resto `#24272b`; altura = 18% + normalização min-max × 82%. Rodapé: 3 stats (PR atual em lima, e1RM máx, crescimento % em azul).
- Card **Volume · semana a semana**: 4 linhas (−3 sem … Atual), grid `58px 1fr 62px`; barra horizontal 10px de altura em trilho `#0c0d0f`, preenchimento proporcional ao máximo, semana atual em lima; valor "N,Nk kg".
- Lista **Recordes pessoais**: nome + carga (mono lima) + data (mono 10px).

### 4. Agenda
- Header "Agenda" + mês/ano em mono lima.
- Card calendário: linha de dias D S T Q Q S S (mono 9px), grid 7 colunas, células 38px: dia treinado = fundo lima/texto escuro/700; hoje = borda `#3a3e43` (ou borda branca 2px se também treinou); dias futuros = `#3a3e43`. Legenda "Treinou / Hoje".
- 2 stat cards: **Treinos no mês** (lima) e **Média semanal** ("N,Nx").
- Lista **Histórico**: últimas 8 sessões (mesmo estilo de Últimos treinos).

### Tab bar
Fixa embaixo, max-width 430px, fundo `rgba(12,13,15,.92)` + `backdrop-filter: blur(12px)`, borda superior `#1c1f23`. 4 abas texto-apenas (Início / Treino / Progresso / Agenda), mono 10px uppercase letter-spacing .12em; ativa = texto lima + indicador 28×2px lima no topo da aba.

### Overlay de descanso
Pill fixa acima da tab bar (bottom 88px, centralizada): fundo lima, contagem regressiva "72s" (mono 18px/700) + "DESCANSO" + botão ✕ de cancelar; sombra `0 8px 28px rgba(200,240,74,.3)`.

## Interactions & Behavior
- **Iniciar ficha** → cria treino ativo com os exercícios da ficha, 3 séries pré-preenchidas com kg/reps do último treino daquele exercício; navega para aba Treino.
- **Check de série** → marca feita (estilo apagado) e, se "descanso automático" ativo, inicia contagem de descanso (padrão 90s, configurável 30–300s).
- **Concluir (✓)** → soma volume das séries feitas (kg×reps), salva sessão {data, ficha, grupo, volume, duração} no histórico, limpa treino ativo, volta ao Início.
- **✕ abandonar** → `confirm()` antes de descartar.
- Cronômetro do treino e do descanso atualizam a cada 1s.
- Chips/aba: troca imediata, sem transição.
- Detectar novo PR ao vivo: maior kg de série feita > PR registrado → badge pulsante.

## State Management
- `tab` (inicio | treino | progresso | agenda)
- `active`: null | { fichaId, grupo, startTs, exIndex, exercises: [{ name, note, sets: [{ kg, reps, done }] }] }
- `sessions`: [{ date ISO, fichaId, grupo, vol, durMin }]
- `restUntil`: timestamp | null
- `progressEx`: exercício selecionado no gráfico
- **Persistência**: no protótipo, localStorage (`treino-backlog-v1` = { active, sessions }). Em produção, usar storage local do dispositivo (offline-first é essencial — academia pode não ter sinal); sync remoto opcional.
- Dados derivados: volume/contagem semanal (semana começa segunda), sequência de semanas, e1RM (Epley), min-max do gráfico.

## Data model (seed do protótipo)
- 4 fichas fixas (A: Peito e Tríceps, B: Costas e Bíceps, C: Pernas, D: Ombros e Core), 5 exercícios cada.
- Catálogo de exercícios com PR, último kg × reps e histórico de e1RM (10 semanas). No protótipo é seed estático; em produção, derivar do histórico real de sessões.

## Configurações (Tweaks no protótipo)
- `descansoSegundos` (30–300, padrão 90)
- `descansoAutomatico` (boolean, padrão true)
- `metaSemanal` (1–7, padrão 4)

## Assets
Nenhuma imagem/ícone externo. Fontes via Google Fonts: **Archivo** e **IBM Plex Mono**. Glifos de texto simples (✓ ✕ → −) — em produção, substituir por ícones do design system escolhido.

## Files
- `Treino App.dc.html` — protótipo completo (as 4 telas + lógica). O markup entre `<x-dc>` contém o layout com estilos inline; a classe `Component` no `<script>` contém toda a lógica/estado.
