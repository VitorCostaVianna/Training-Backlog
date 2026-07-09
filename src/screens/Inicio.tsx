import { useApp } from '../state/AppState'
import { SessionRow } from '../components/SessionRow'
import { fmtDate, fmtInt, fmtVolK, initialsOf, todayLabel } from '../lib/format'
import { streakWeeks, weekSessions } from '../lib/stats'
import type { Ficha, Session } from '../lib/types'

export function Inicio({
  onOpenSettings,
  onEditFicha,
  onNewFicha,
  onOpenSession,
}: {
  onOpenSettings: () => void
  onEditFicha: (f: Ficha) => void
  onNewFicha: () => void
  onOpenSession: (s: Session) => void
}) {
  const { profile, email, fichas, sessions, startFicha, loadExampleData } = useApp()
  const now = new Date()

  const week = weekSessions(sessions, now)
  const weekVolume = week.reduce((acc, s) => acc + s.volume, 0)
  const streak = streakWeeks(sessions, now)
  const meta = profile?.metaSemanal ?? 4

  const lastByFicha = new Map<string, string>()
  for (const s of sessions) {
    if (s.fichaId && (!lastByFicha.has(s.fichaId) || s.date > lastByFicha.get(s.fichaId)!)) {
      lastByFicha.set(s.fichaId, s.date)
    }
  }

  const recent = sessions.slice(-4).reverse()

  return (
    <div className="screen">
      <div className="home-header">
        <div>
          <div className="day-label">{todayLabel(now)}</div>
          <div className="screen-title">Backlog de Treino</div>
        </div>
        <button className="avatar" onClick={onOpenSettings} aria-label="Configurações">
          {initialsOf(profile?.displayName || email)}
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="micro-label">Semana</div>
          <div className="stat-value stat-value--accent">
            {week.length}
            <span className="stat-unit">/{meta}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="micro-label">Volume sem.</div>
          <div className="stat-value">
            {fmtVolK(weekVolume)}
            <span className="stat-unit"> kg</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="micro-label">Sequência</div>
          <div className="stat-value">
            {streak}
            <span className="stat-unit"> sem</span>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="section-label">Fichas</div>
        {fichas.map((f) => (
          <div className="ficha-card" key={f.id}>
            <div className="ficha-badge">{f.letter}</div>
            <div className="ficha-info">
              <div className="ficha-name">{f.grupo}</div>
              <div className="ficha-sub">
                {f.exercises.length} exercícios ·{' '}
                {lastByFicha.has(f.id) ? 'último ' + fmtDate(lastByFicha.get(f.id)!) : 'nunca feito'}
              </div>
            </div>
            <button className="btn-edit-ficha" onClick={() => onEditFicha(f)} aria-label={`Editar ficha ${f.letter}`}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M2 12 2.5 9.5 9.5 2.5l2 2L4.5 11.5 2 12Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  fill="none"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="btn-start" onClick={() => startFicha(f)}>
              Iniciar
            </button>
          </div>
        ))}
        <button className="btn-new-ficha" onClick={onNewFicha}>
          + Nova ficha
        </button>
      </div>

      <div className="stack">
        <div className="section-label">Últimos treinos</div>
        {recent.length === 0 ? (
          <>
            <div className="empty-card">
              <div className="empty-title">Nenhum treino registrado</div>
              <div className="empty-sub">Inicie uma ficha acima para registrar o primeiro.</div>
            </div>
            <button className="btn-example" onClick={loadExampleData}>
              Carregar dados de exemplo
            </button>
          </>
        ) : (
          recent.map((s) => (
            <SessionRow
              key={s.id}
              date={fmtDate(s.date)}
              title={`Treino ${s.fichaLetter} · ${s.grupo}`}
              meta={`${fmtInt(s.volume)} kg · ${s.durationMin}min`}
              onClick={() => onOpenSession(s)}
            />
          ))
        )}
      </div>
    </div>
  )
}
