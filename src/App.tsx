import { useEffect, useState } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { isBackendReachable, supabase, supabaseConfigured } from './lib/supabase'
import { clearLastUser, loadCache, loadLastUser, saveLastUser } from './lib/storage'
import type { LastUser } from './lib/storage'
import { AppProvider, useApp } from './state/AppState'
import { AuthScreen } from './screens/Auth'
import { Inicio } from './screens/Inicio'
import { Treino } from './screens/Treino'
import { Progresso } from './screens/Progresso'
import { Agenda } from './screens/Agenda'
import { TabBar } from './components/TabBar'
import { RestOverlay } from './components/RestOverlay'
import { SettingsSheet } from './components/SettingsSheet'
import { FichaEditor } from './components/FichaEditor'
import { SessionDetail } from './components/SessionDetail'
import type { Ficha, Session } from './lib/types'

function ConfigMissing() {
  return (
    <div className="config-missing">
      <div className="screen-title">Backlog de Treino</div>
      <p>
        Configuração do Supabase ausente. Copie <code>.env.example</code> para <code>.env</code>, preencha{' '}
        <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> com os dados do seu projeto e
        reinicie o servidor.
      </p>
      <p>
        Antes disso, rode <code>supabase/migration.sql</code> no SQL Editor do projeto.
      </p>
    </div>
  )
}

function Shell() {
  const { tab } = useApp()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingFicha, setEditingFicha] = useState<Ficha | 'new' | null>(null)
  const [viewingSession, setViewingSession] = useState<Session | null>(null)
  return (
    <div className="app-shell">
      {tab === 'inicio' && (
        <Inicio
          onOpenSettings={() => setSettingsOpen(true)}
          onEditFicha={(f) => setEditingFicha(f)}
          onNewFicha={() => setEditingFicha('new')}
          onOpenSession={setViewingSession}
        />
      )}
      {tab === 'treino' && <Treino />}
      {tab === 'progresso' && <Progresso />}
      {tab === 'agenda' && <Agenda onOpenSession={setViewingSession} />}
      <RestOverlay />
      <TabBar />
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {editingFicha !== null && (
        <FichaEditor ficha={editingFicha === 'new' ? null : editingFicha} onClose={() => setEditingFicha(null)} />
      )}
      {viewingSession !== null && <SessionDetail session={viewingSession} onClose={() => setViewingSession(null)} />}
    </div>
  )
}

function AuthGate() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [offlineUser, setOfflineUser] = useState<LastUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      // Offline com token vencido, getSession() fica retentando o refresh e a
      // promise demora/nunca resolve — sem o timeout o app trava no "Carregando".
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ])
      if (cancelled) return
      const bootSession = result?.data.session ?? null
      if (bootSession) {
        setSession(bootSession)
      } else {
        // Sem sessão: pode ser logout de verdade ou token vencido sem rede
        // (academia). Com backend inacessível + cache local do último usuário,
        // entra em modo offline; a sessão real volta quando a rede voltar.
        const last = loadLastUser()
        if (last && loadCache(last.id).profile !== null && !(await isBackendReachable())) {
          if (!cancelled) setOfflineUser(last)
        }
      }
      if (!cancelled) setReady(true)
    }
    boot()

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (s?.user) {
        saveLastUser({ id: s.user.id, email: s.user.email ?? '' })
        setOfflineUser(null)
      } else if (event === 'SIGNED_OUT') {
        clearLastUser()
        setOfflineUser(null)
      }
    })

    // Rede voltou durante o modo offline: cutuca o client a renovar o token.
    const onOnline = () => supabase.auth.getSession()
    window.addEventListener('online', onOnline)
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      window.removeEventListener('online', onOnline)
    }
  }, [])

  // Fallback do evento 'online' (nem sempre dispara): com modo offline ativo,
  // tenta restaurar a sessão periodicamente.
  useEffect(() => {
    if (!offlineUser || session) return
    const id = setInterval(() => supabase.auth.getSession(), 30000)
    return () => clearInterval(id)
  }, [offlineUser, session])

  if (!ready) {
    return (
      <div className="boot">
        <div className="section-label">Carregando…</div>
      </div>
    )
  }
  const user = session?.user ? { id: session.user.id, email: session.user.email ?? '' } : offlineUser
  if (!user) return <AuthScreen />
  return (
    <AppProvider userId={user.id} email={user.email}>
      <Shell />
    </AppProvider>
  )
}

export default function App() {
  if (!supabaseConfigured) return <ConfigMissing />
  return <AuthGate />
}
