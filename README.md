# Backlog de Treino

PWA mobile-first (pt-BR) para registrar treinos de musculação e acompanhar progressão.
React + Vite + TypeScript no frontend; Supabase (Postgres + Auth + RLS) no backend;
offline-first com cache local e fila de sincronização.

Design de referência em [design_handoff_backlog_treino/](design_handoff_backlog_treino/).

## Setup

1. **Crie um projeto no [Supabase](https://supabase.com)** (gratuito).
2. **Rode a migração**: no dashboard, abra *SQL Editor*, cole o conteúdo de
   [supabase/migration.sql](supabase/migration.sql) e execute. Isso cria as tabelas
   (`profiles`, `fichas`, `ficha_exercises`, `sessions`, `session_exercises`, `session_sets`),
   habilita Row Level Security em todas (cada usuário só lê/escreve as próprias linhas)
   e instala o trigger de signup que cria o perfil + 4 fichas padrão (A–D).
3. **Configure o ambiente**: copie `.env.example` para `.env` e preencha
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (dashboard → *Project Settings* → *API*).
4. **(Opcional, recomendado para testar)** desative a confirmação de e-mail em
   *Authentication → Sign In / Providers → Email → Confirm email*, para o cadastro
   entrar direto sem clicar em link de confirmação.
5. **Rode**:

   ```sh
   npm install
   npm run dev        # desenvolvimento
   npm run build      # produção (dist/) — inclui service worker
   npm run preview    # serve o build de produção
   ```

## Arquitetura

- **Auth**: e-mail/senha via Supabase Auth ([src/screens/Auth.tsx](src/screens/Auth.tsx)).
  O trigger `handle_new_user` (na migração) semeia perfil e fichas padrão — estrutura de
  template, sem histórico falso. Na primeira tela vazia há um botão explícito
  "Carregar dados de exemplo".
- **Offline-first** ([src/lib/storage.ts](src/lib/storage.ts)):
  - O **treino em andamento** vive só no dispositivo (`localStorage`), nunca depende de rede
    e sobrevive a reload/crash. Ao reabrir com treino ativo, o app volta direto à aba Treino.
  - Leituras remotas são espelhadas num **cache local** por usuário; sem rede, o app
    renderiza tudo a partir do cache.
  - Treinos concluídos entram numa **fila (outbox)** com UUIDs gerados no cliente e são
    enviados via upsert (idempotente) quando a conexão volta (`online` event / próximo boot).
- **Estatísticas derivadas** ([src/lib/stats.ts](src/lib/stats.ts)): PR, "último kg × reps",
  histórico de e1RM (Epley, 10 semanas), volume/sequência semanal — tudo calculado do
  histórico real de séries, nada denormalizado no banco.
- **PWA**: `vite-plugin-pwa` (Workbox) pré-cacheia o app shell e faz runtime-cache das
  fontes do Google; manifest + ícones em [public/icons/](public/icons/). Instalável em
  iOS/Android ("Adicionar à tela de início").
- **Privacidade**: o cliente usa apenas a anon key; o isolamento entre contas é garantido
  pelas políticas de RLS no Postgres, não por filtro no cliente.

## Fora de escopo (por ora)

Billing/assinaturas e empacotamento nativo (Capacitor) — a arquitetura (contas privadas,
RLS, IDs de cliente, outbox) foi pensada para acomodá-los depois sem retrabalho.
