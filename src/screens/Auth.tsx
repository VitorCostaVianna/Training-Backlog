import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

function translateError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('already registered')) return 'Este e-mail já tem uma conta.'
  if (m.includes('at least 6 characters')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('valid email')) return 'Informe um e-mail válido.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um instante.'
  if (m.includes('fetch')) return 'Sem conexão. Verifique sua internet.'
  return message
}

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) setError(translateError(err.message))
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) setError(translateError(err.message))
        else if (data.user && !data.session) setInfo('Conta criada. Confirme seu e-mail para entrar.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="auth-screen">
      <div>
        <div className="day-label">{isLogin ? 'Entrar' : 'Criar conta'}</div>
        <div className="screen-title">Backlog de Treino</div>
        <div className="empty-sub" style={{ marginTop: 6 }}>
          Registre seus treinos e acompanhe sua progressão.
        </div>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <div className="auth-field">
          <div className="micro-label">E-mail</div>
          <input
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <div className="micro-label">Senha</div>
          <input
            className="auth-input"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? '…' : isLogin ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <div className="auth-switch">
        {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
        <button
          type="button"
          onClick={() => {
            setMode(isLogin ? 'signup' : 'login')
            setError('')
            setInfo('')
          }}
        >
          {isLogin ? 'Criar conta' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
