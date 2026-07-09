import { useApp } from '../state/AppState'
import { SessionRow } from '../components/SessionRow'
import { fmtDate, fmtInt, monthLabel } from '../lib/format'
import type { Session } from '../lib/types'

export function Agenda({ onOpenSession }: { onOpenSession: (s: Session) => void }) {
  const { sessions } = useApp()
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const trained = new Set(sessions.map((s) => s.date))
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()

  let monthCount = 0
  const cells: { day: number | null; trained: boolean; today: boolean; future: boolean }[] = []
  for (let pad = 0; pad < firstDow; pad++) cells.push({ day: null, trained: false, today: false, future: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isTrained = trained.has(iso)
    if (isTrained) monthCount++
    cells.push({ day: d, trained: isTrained, today: d === now.getDate(), future: d > now.getDate() })
  }

  const weeksElapsed = Math.max(1, Math.ceil(now.getDate() / 7))
  const weekAvg = (monthCount / weeksElapsed).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const history = sessions.slice(-8).reverse()

  return (
    <div className="screen screen--tight">
      <div className="home-header">
        <div className="screen-title">Agenda</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
          {monthLabel(now)}
        </div>
      </div>

      <div className="card card--gap12" style={{ gap: 10 }}>
        <div className="cal-dows">
          <div>D</div>
          <div>S</div>
          <div>T</div>
          <div>Q</div>
          <div>Q</div>
          <div>S</div>
          <div>S</div>
        </div>
        <div className="cal-grid">
          {cells.map((c, i) => {
            if (c.day === null) return <div key={i} className="cal-day" />
            let cls = 'cal-day'
            if (c.trained) cls += ' cal-day--trained'
            else if (c.future) cls += ' cal-day--future'
            if (c.today) cls += c.trained ? ' cal-day--today-trained' : ' cal-day--today'
            return (
              <div key={i} className={cls}>
                {c.day}
              </div>
            )
          })}
        </div>
        <div className="cal-legend">
          <div className="cal-legend-item">
            <div className="cal-swatch" style={{ background: 'var(--accent)' }} />
            Treinou
          </div>
          <div className="cal-legend-item">
            <div className="cal-swatch" style={{ border: '1px solid var(--border-check)' }} />
            Hoje
          </div>
        </div>
      </div>

      <div className="agenda-stats">
        <div className="agenda-stat-card">
          <div className="micro-label">Treinos no mês</div>
          <div className="agenda-stat-value" style={{ color: 'var(--accent)' }}>
            {monthCount}
          </div>
        </div>
        <div className="agenda-stat-card">
          <div className="micro-label">Média semanal</div>
          <div className="agenda-stat-value">{weekAvg}x</div>
        </div>
      </div>

      <div className="stack">
        <div className="section-label">Histórico</div>
        {history.length === 0 ? (
          <div className="empty-card">
            <div className="empty-title">Nenhum treino registrado</div>
            <div className="empty-sub">Seu histórico aparece aqui.</div>
          </div>
        ) : (
          history.map((s) => (
            <SessionRow
              key={s.id}
              date={fmtDate(s.date)}
              title={`Treino ${s.fichaLetter} · ${s.grupo}`}
              meta={`${fmtInt(s.volume)} kg`}
              onClick={() => onOpenSession(s)}
            />
          ))
        )}
      </div>
    </div>
  )
}
