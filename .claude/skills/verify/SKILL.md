---
name: verify
description: Build, launch and drive the Backlog de Treino PWA in a headless browser to verify changes end-to-end, without needing real Supabase credentials.
---

# Verifying Backlog de Treino

## Build & serve

```powershell
# .env com URL fake torna supabaseConfigured=true; fetches falham -> caminho offline
Set-Content .env "VITE_SUPABASE_URL=https://demo-fake.supabase.co`nVITE_SUPABASE_ANON_KEY=fake"
npm run build          # tsc --noEmit && vite build (env é embutido no build!)
npm run preview        # serve dist/ em http://localhost:4173 (SW ativo; dev server NÃO registra SW)
```

Remova o `.env` fake ao terminar (o real é do usuário).

## Drive sem backend

Driver playwright-core + Chrome instalado (`chromium.launch({ channel: 'chrome' })`,
viewport 430×900) — instalar `playwright-core` no scratchpad, nunca no projeto.
Receita completa que funcionou: `drive.cjs` no scratchpad da sessão de 2026-07-07.

1. **Sessão fake** (supabase-js lê do storage sem validar assinatura se não expirada):
   gravar em `localStorage['sb-demo-fake-auth-token']` um objeto
   `{ access_token, token_type:'bearer', expires_at: agora+1ano, refresh_token, user:{ id, email, aud:'authenticated', role:'authenticated' } }`.
   A chave é `sb-<primeiro-label-do-host>-auth-token`.
2. **Fichas** vêm do servidor normalmente; offline, semear
   `localStorage['bt-cache-v1:<userId>']` com `{ profile, fichas, sessions: [], profileDirty: false }`.
3. Recarregar → Início renderiza; clicar "Carregar dados de exemplo" popula 24 sessões
   pelo caminho real (ficam no outbox `bt-outbox-v1:<userId>`, sync falha de propósito).

## Fluxos que valem dirigir

- Iniciar ficha → inputs pré-preenchidos → kg com vírgula ("82,5" → e1RM "104,5") →
  check da série → pill de descanso aparece → NOVO PR se kg > PR derivado.
- Reload no meio do treino → deve reabrir direto na aba Treino com tudo preservado.
- ✕ abandona com `window.confirm` (testar dismiss E accept via `page.once('dialog', …)`).
- ✓ concluir → volta ao Início, Semana incrementa, sessão nova em "Últimos treinos".
- Avatar → sheet de configurações; mudar descanso muda o rótulo "Descanso Ns" no treino.
- PWA: `fetch('/manifest.webmanifest')` + `navigator.serviceWorker.getRegistration()`.

## Gotchas

- Erros de console `fetch/ERR_NAME` do Supabase fake são esperados; filtrar antes de acusar.
- Clicar num check já feito DESMARCA a série (volume da sessão pode zerar num script).
- Screenshots em 430×900 batem 1:1 com o protótipo `Treino App.dc.html`.
