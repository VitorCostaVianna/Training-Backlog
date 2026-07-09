import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anonKey ?? 'placeholder')

/**
 * Sonda rápida de conectividade com o backend (4s de timeout).
 * Distingue "sem sessão porque estou offline" (modo offline com cache)
 * de "sem sessão porque fui deslogado" (tela de login).
 */
export async function isBackendReachable(): Promise<boolean> {
  if (!navigator.onLine) return false
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey ?? '' },
      signal: ctrl.signal,
    })
    clearTimeout(t)
    return res.ok
  } catch {
    return false
  }
}
