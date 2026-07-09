import type { ActiveWorkout, Ficha, Profile, Session } from './types'

// Camada offline-first: cache local de leitura + fila (outbox) de escritas
// pendentes. O treino ativo vive apenas aqui até ser concluído.

export interface LocalCache {
  profile: Profile | null
  fichas: Ficha[]
  sessions: Session[]
  profileDirty: boolean // settings alteradas offline, ainda não enviadas
}

// Operação pendente de ficha: upsert completo (ficha !== null) ou arquivamento.
export interface FichaOp {
  fichaId: string
  ficha: Ficha | null
  deletedExerciseIds: string[]
}

const cacheKey = (userId: string) => `bt-cache-v1:${userId}`
const activeKey = (userId: string) => `bt-active-v1:${userId}`
const outboxKey = (userId: string) => `bt-outbox-v1:${userId}`
const fichaOpsKey = (userId: string) => `bt-fichaops-v1:${userId}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage cheio/indisponível — app segue funcionando em memória
  }
}

export function loadCache(userId: string): LocalCache {
  return (
    read<LocalCache>(cacheKey(userId)) ?? { profile: null, fichas: [], sessions: [], profileDirty: false }
  )
}

export function saveCache(userId: string, cache: LocalCache) {
  write(cacheKey(userId), cache)
}

export function loadActive(userId: string): ActiveWorkout | null {
  return read<ActiveWorkout>(activeKey(userId))
}

export function saveActive(userId: string, active: ActiveWorkout | null) {
  if (active === null) {
    try {
      localStorage.removeItem(activeKey(userId))
    } catch {
      /* ignore */
    }
  } else {
    write(activeKey(userId), active)
  }
}

export function loadOutbox(userId: string): Session[] {
  return read<Session[]>(outboxKey(userId)) ?? []
}

export function saveOutbox(userId: string, pending: Session[]) {
  write(outboxKey(userId), pending)
}

// Identidade do último usuário logado — permite abrir o app offline com o
// cache local quando o refresh do token falha por falta de rede (academia).
// Limpo no logout explícito para não vazar dados em aparelho compartilhado.
const lastUserKey = 'bt-last-user-v1'

export interface LastUser {
  id: string
  email: string
}

export function loadLastUser(): LastUser | null {
  return read<LastUser>(lastUserKey)
}

export function saveLastUser(user: LastUser) {
  write(lastUserKey, user)
}

export function clearLastUser() {
  try {
    localStorage.removeItem(lastUserKey)
  } catch {
    /* ignore */
  }
}

export function loadFichaOps(userId: string): FichaOp[] {
  return read<FichaOp[]>(fichaOpsKey(userId)) ?? []
}

export function saveFichaOps(userId: string, ops: FichaOp[]) {
  write(fichaOpsKey(userId), ops)
}
