import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ActiveWorkout, Ficha, Profile, Session, Tab } from '../lib/types'
import { buildExerciseStats } from '../lib/stats'
import type { ExerciseStats } from '../lib/stats'
import { parseNum, parseReps } from '../lib/format'
import { loadActive, loadCache, loadFichaOps, loadOutbox, saveActive, saveCache, saveFichaOps, saveOutbox } from '../lib/storage'
import type { FichaOp } from '../lib/storage'
import { fetchFichas, fetchProfile, fetchSessions, pushFichaOp, pushProfile, pushSession } from '../lib/db'
import { supabase } from '../lib/supabase'

interface AppStateValue {
  userId: string
  email: string
  profile: Profile | null
  fichas: Ficha[]
  sessions: Session[]
  stats: Map<string, ExerciseStats>
  tab: Tab
  setTab: (t: Tab) => void
  active: ActiveWorkout | null
  restUntil: number | null
  restDuration: number
  progressEx: string
  setProgressEx: (name: string) => void
  startFicha: (ficha: Ficha) => void
  updateActive: (mutate: (a: ActiveWorkout) => void) => void
  toggleSet: (setIndex: number) => void
  finishWorkout: () => void
  abandonWorkout: () => void
  startRest: () => void
  cancelRest: () => void
  updateSettings: (patch: Partial<Pick<Profile, 'descansoSegundos' | 'descansoAutomatico' | 'metaSemanal'>>) => void
  saveFicha: (ficha: Ficha, deletedExerciseIds: string[]) => void
  archiveFicha: (fichaId: string) => void
  signOut: () => void
}

const Ctx = createContext<AppStateValue | null>(null)

export function useApp(): AppStateValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fora do AppProvider')
  return v
}

/** Re-renderiza a cada `ms` enquanto `enabled` (cronômetro do treino / descanso). */
export function useTick(enabled: boolean, ms = 1000): number {
  const [, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setN((n) => n + 1), ms)
    return () => clearInterval(id)
  }, [enabled, ms])
  return Date.now()
}

export function AppProvider({ userId, email, children }: { userId: string; email: string; children: ReactNode }) {
  const initial = useMemo(() => loadCache(userId), [userId])
  const [profile, setProfile] = useState<Profile | null>(initial.profile)
  const [fichas, setFichas] = useState<Ficha[]>(initial.fichas)
  const [sessions, setSessions] = useState<Session[]>(initial.sessions)
  const [active, setActiveState] = useState<ActiveWorkout | null>(() => loadActive(userId))
  // Com treino em andamento, o app reabre direto na aba Treino (retomada na academia).
  const [tab, setTab] = useState<Tab>(() => (loadActive(userId) ? 'treino' : 'inicio'))
  const [restUntil, setRestUntil] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState<number>(90)
  const [progressEx, setProgressEx] = useState<string>('')

  const flushing = useRef(false)

  const persistCache = useCallback(
    (next: { profile?: Profile | null; fichas?: Ficha[]; sessions?: Session[]; profileDirty?: boolean }) => {
      const cur = loadCache(userId)
      saveCache(userId, {
        profile: next.profile !== undefined ? next.profile : cur.profile,
        fichas: next.fichas ?? cur.fichas,
        sessions: next.sessions ?? cur.sessions,
        profileDirty: next.profileDirty ?? cur.profileDirty,
      })
    },
    [userId]
  )

  // Envia a fila de sessões pendentes e settings alteradas offline.
  const flushOutbox = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return
    flushing.current = true
    try {
      // Fichas primeiro: uma sessão pendente pode referenciar uma ficha criada offline.
      const fichaOps = loadFichaOps(userId)
      const opsLeft: FichaOp[] = []
      for (const op of fichaOps) {
        try {
          await pushFichaOp(op)
        } catch {
          opsLeft.push(op)
        }
      }
      saveFichaOps(userId, opsLeft)

      const pending = loadOutbox(userId)
      const remaining: Session[] = []
      for (const sess of pending) {
        try {
          await pushSession(sess)
        } catch {
          remaining.push(sess)
        }
      }
      saveOutbox(userId, remaining)
      const cache = loadCache(userId)
      if (cache.profileDirty && cache.profile) {
        try {
          await pushProfile(cache.profile)
          persistCache({ profileDirty: false })
        } catch {
          /* tenta de novo no próximo flush */
        }
      }
    } finally {
      flushing.current = false
    }
  }, [userId, persistCache])

  // Sincroniza: envia pendências, depois busca o estado remoto.
  const refresh = useCallback(async () => {
    await flushOutbox()
    try {
      const [remoteProfile, remoteFichas, remoteSessions] = await Promise.all([
        fetchProfile(userId),
        fetchFichas(),
        fetchSessions(),
      ])
      // Sessões ainda na fila (falha no flush) continuam visíveis localmente.
      const pending = loadOutbox(userId)
      const merged = [...remoteSessions]
      for (const p of pending) if (!merged.some((s) => s.id === p.id)) merged.push(p)
      merged.sort((a, b) => a.date.localeCompare(b.date))

      // Edições de ficha ainda na fila (offline) vencem a versão do servidor.
      let mergedFichas = [...remoteFichas]
      for (const op of loadFichaOps(userId)) {
        mergedFichas = mergedFichas.filter((f) => f.id !== op.fichaId)
        if (op.ficha !== null) mergedFichas.push(op.ficha)
      }
      mergedFichas.sort((a, b) => a.position - b.position)

      const cache = loadCache(userId)
      const effectiveProfile = cache.profileDirty && cache.profile ? cache.profile : remoteProfile
      setProfile(effectiveProfile)
      setFichas(mergedFichas)
      setSessions(merged)
      persistCache({ profile: effectiveProfile, fichas: mergedFichas, sessions: merged })
    } catch {
      // offline ou erro transitório — segue com o cache local
    }
  }, [userId, flushOutbox, persistCache])

  useEffect(() => {
    refresh()
    const onOnline = () => refresh()
    window.addEventListener('online', onOnline)
    // O evento 'online' nem sempre dispara (sinal oscilando, webview) — com
    // pendências na fila, tenta de novo periodicamente e ao voltar ao app.
    const hasPending = () =>
      loadOutbox(userId).length > 0 || loadFichaOps(userId).length > 0 || loadCache(userId).profileDirty
    const retry = () => {
      if (hasPending()) flushOutbox()
    }
    const interval = setInterval(retry, 30000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') retry()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, userId, flushOutbox])

  // Mantém a tela acordada durante o treino (Wake Lock; silencioso sem suporte).
  const hasActive = active !== null
  useEffect(() => {
    if (!hasActive || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let stopped = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // sem permissão/suporte — segue sem manter a tela
      }
    }
    // O sistema solta o lock quando o app sai de foco; readquire ao voltar.
    const onVisible = () => {
      if (!stopped && document.visibilityState === 'visible') request()
    }
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [hasActive])

  // Expira o descanso sozinho.
  useEffect(() => {
    if (restUntil === null) return
    const id = setInterval(() => {
      if (Date.now() >= restUntil) setRestUntil(null)
    }, 250)
    return () => clearInterval(id)
  }, [restUntil])

  const stats = useMemo(() => buildExerciseStats(sessions, new Date()), [sessions])

  const setActive = useCallback(
    (a: ActiveWorkout | null) => {
      setActiveState(a)
      saveActive(userId, a)
    },
    [userId]
  )

  const updateActive = useCallback(
    (mutate: (a: ActiveWorkout) => void) => {
      setActiveState((cur) => {
        if (!cur) return cur
        const next = structuredClone(cur)
        mutate(next)
        saveActive(userId, next)
        return next
      })
    },
    [userId]
  )

  const startRest = useCallback(() => {
    const secs = profile?.descansoSegundos ?? 90
    setRestDuration(secs)
    setRestUntil(Date.now() + secs * 1000)
  }, [profile])

  const startFicha = useCallback(
    (ficha: Ficha) => {
      const exercises = ficha.exercises.map((fe) => {
        const s = stats.get(fe.name)
        const kg = s && s.lastKg > 0 ? String(s.lastKg).replace('.', ',') : ''
        const reps = s && s.lastReps > 0 ? s.lastRepsText || String(s.lastReps) : ''
        const setsCount = fe.setsCount ?? 3
        return {
          name: fe.name,
          note: '',
          technique: fe.technique ?? '',
          sets: Array.from({ length: setsCount }, () => ({ kg, reps, done: false })),
        }
      })
      setActive({
        fichaId: ficha.id,
        fichaLetter: ficha.letter,
        grupo: ficha.grupo,
        startTs: Date.now(),
        exIndex: 0,
        exercises,
      })
      setTab('treino')
    },
    [stats, setActive]
  )

  const toggleSet = useCallback(
    (setIndex: number) => {
      if (!active) return
      const wasDone = active.exercises[active.exIndex].sets[setIndex].done
      updateActive((a) => {
        a.exercises[a.exIndex].sets[setIndex].done = !wasDone
      })
      if (!wasDone && (profile?.descansoAutomatico ?? true)) startRest()
    },
    [active, profile, updateActive, startRest]
  )

  const enqueueSessions = useCallback(
    (newSessions: Session[]) => {
      const merged = [...sessions, ...newSessions].sort((a, b) => a.date.localeCompare(b.date))
      setSessions(merged)
      persistCache({ sessions: merged })
      saveOutbox(userId, [...loadOutbox(userId), ...newSessions])
      flushOutbox()
    },
    [sessions, userId, persistCache, flushOutbox]
  )

  const finishWorkout = useCallback(() => {
    if (!active) return
    const doneCount = active.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0)
    if (doneCount === 0) {
      // Nada feito: uma sessão vazia só poluiria o histórico.
      if (window.confirm('Nenhuma série foi marcada. Descartar este treino?')) {
        setActive(null)
        setRestUntil(null)
        setTab('inicio')
      }
      return
    }
    let volume = 0
    // Só o que foi feito entra na sessão: séries não marcadas (ex. a 3ª que
    // ficou vazia) e exercícios sem nenhuma série feita são descartados.
    const exercises = active.exercises
      .map((ex, pos) => ({
        id: crypto.randomUUID(),
        name: ex.name,
        note: ex.note,
        position: pos,
        technique: ex.technique ?? '',
        sets: ex.sets
          .filter((s) => s.done)
          .map((s, i) => {
            const kg = parseNum(s.kg)
            const parsed = parseReps(s.reps)
            volume += kg * parsed.total
            return {
              id: crypto.randomUUID(),
              setNumber: i + 1,
              kg,
              reps: parsed.total,
              repsDetail: parsed.blocks.length > 1 ? String(s.reps).trim() : '',
              done: true,
            }
          }),
      }))
      .filter((ex) => ex.sets.length > 0)
      .map((ex, pos) => ({ ...ex, position: pos }))
    const now = new Date()
    const session: Session = {
      id: crypto.randomUUID(),
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      fichaId: active.fichaId,
      fichaLetter: active.fichaLetter,
      grupo: active.grupo,
      volume: Math.round(volume),
      durationMin: Math.max(1, Math.round((Date.now() - active.startTs) / 60000)),
      startedAt: new Date(active.startTs).toISOString(),
      exercises,
    }
    enqueueSessions([session])
    setActive(null)
    setRestUntil(null)
    setTab('inicio')
  }, [active, enqueueSessions, setActive])

  const abandonWorkout = useCallback(() => {
    setActive(null)
    setRestUntil(null)
    setTab('inicio')
  }, [setActive])

  const updateSettings = useCallback(
    (patch: Partial<Pick<Profile, 'descansoSegundos' | 'descansoAutomatico' | 'metaSemanal'>>) => {
      setProfile((cur) => {
        if (!cur) return cur
        const next = { ...cur, ...patch }
        persistCache({ profile: next, profileDirty: true })
        pushProfile(next)
          .then(() => persistCache({ profileDirty: false }))
          .catch(() => {
            /* reenvia no próximo flush */
          })
        return next
      })
    },
    [persistCache]
  )

  const enqueueFichaOp = useCallback(
    (op: FichaOp) => {
      const ops = loadFichaOps(userId)
      const prev = ops.find((o) => o.fichaId === op.fichaId)
      const mergedOp: FichaOp = {
        ...op,
        deletedExerciseIds: [...new Set([...(prev?.deletedExerciseIds ?? []), ...op.deletedExerciseIds])],
      }
      saveFichaOps(userId, [...ops.filter((o) => o.fichaId !== op.fichaId), mergedOp])
      flushOutbox()
    },
    [userId, flushOutbox]
  )

  const saveFicha = useCallback(
    (ficha: Ficha, deletedExerciseIds: string[]) => {
      setFichas((cur) => {
        const next = [...cur.filter((f) => f.id !== ficha.id), ficha].sort((a, b) => a.position - b.position)
        persistCache({ fichas: next })
        return next
      })
      enqueueFichaOp({ fichaId: ficha.id, ficha, deletedExerciseIds })
    },
    [persistCache, enqueueFichaOp]
  )

  const archiveFicha = useCallback(
    (fichaId: string) => {
      setFichas((cur) => {
        const next = cur.filter((f) => f.id !== fichaId)
        persistCache({ fichas: next })
        return next
      })
      enqueueFichaOp({ fichaId, ficha: null, deletedExerciseIds: [] })
    },
    [persistCache, enqueueFichaOp]
  )

  const signOut = useCallback(() => {
    supabase.auth.signOut()
  }, [])

  const value: AppStateValue = {
    userId,
    email,
    profile,
    fichas,
    sessions,
    stats,
    tab,
    setTab,
    active,
    restUntil,
    restDuration,
    progressEx,
    setProgressEx,
    startFicha,
    updateActive,
    toggleSet,
    finishWorkout,
    abandonWorkout,
    startRest,
    cancelRest: () => setRestUntil(null),
    updateSettings,
    saveFicha,
    archiveFicha,
    signOut,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
