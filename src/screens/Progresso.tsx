import { useApp } from '../state/AppState'
import { fmtDate, fmtKg, fmtVolK } from '../lib/format'
import { weeklyVolumes } from '../lib/stats'

const EMPTY_HIST = Array(10).fill(0) as number[]

export function Progresso() {
  const { fichas, stats, sessions, progressEx, setProgressEx } = useApp()
  const now = new Date()

  // Chips: exercícios com histórico primeiro (na ordem das fichas); sem histórico, todos.
  const allNames: string[] = []
  for (const f of fichas) for (const e of f.exercises) if (!allNames.includes(e.name)) allNames.push(e.name)
  const withData = allNames.filter((n) => (stats.get(n)?.pr ?? 0) > 0)
  const chipNames = withData.length > 0 ? withData : allNames
  const sel = progressEx && chipNames.includes(progressEx) ? progressEx : chipNames[0] ?? ''

  const selStats = stats.get(sel)
  const hist = selStats?.e1rmHist ?? EMPTY_HIST
  const hmax = Math.max(...hist)
  const hmin = Math.min(...hist)
  const growth = hist[hist.length - 1] - hist[0]
  const hasData = hmax > 0

  const weekVols = weeklyVolumes(sessions, now, 4)
  const maxWeekVol = Math.max(1, ...weekVols)
  const weekLabels = ['−3 sem', '−2 sem', '−1 sem', 'Atual']

  const prs = [...stats.entries()]
    .filter(([, s]) => s.pr > 0)
    .sort((a, b) => b[1].pr - a[1].pr)
    .slice(0, 5)

  return (
    <div className="screen screen--tight">
      <div className="screen-title">Progresso</div>

      <div className="chip-row">
        {chipNames.map((n) => (
          <button
            key={n}
            className={'chip chip--progress' + (n === sel ? ' chip--active' : '')}
            onClick={() => setProgressEx(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-label">e1RM · 10 semanas</div>
          <div className="chart-delta">
            {hasData ? (growth >= 0 ? `+${fmtKg(growth)} kg ↗` : `−${fmtKg(-growth)} kg ↘`) : '—'}
          </div>
        </div>
        <div className="chart-bars">
          {hist.map((v, i) => (
            <div
              key={i}
              className={
                'chart-bar' +
                (i === hist.length - 1 ? ' chart-bar--current' : i >= hist.length - 3 ? ' chart-bar--recent' : '')
              }
              style={{ height: Math.round(18 + ((v - hmin) / Math.max(1, hmax - hmin)) * 82) + '%' }}
            />
          ))}
        </div>
        <div className="chart-stats">
          <div>
            <div className="micro-label">PR atual</div>
            <div className="chart-stat-value" style={{ color: 'var(--accent)' }}>
              {selStats && selStats.pr > 0 ? fmtKg(selStats.pr) + ' kg' : '—'}
            </div>
          </div>
          <div>
            <div className="micro-label">e1RM máx</div>
            <div className="chart-stat-value">{hasData ? fmtKg(hmax) + ' kg' : '—'}</div>
          </div>
          <div>
            <div className="micro-label">10 sem</div>
            <div className="chart-stat-value" style={{ color: 'var(--accent-2)' }}>
              {hasData && hist[0] > 0 ? `${growth >= 0 ? '+' : ''}${Math.round((growth / hist[0]) * 100)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="card card--gap12">
        <div className="card-label">Volume · semana a semana</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {weekVols.map((vol, i) => (
            <div className="week-row" key={i}>
              <div className="week-label">{weekLabels[i]}</div>
              <div className="week-track">
                <div
                  className={'week-fill' + (i === weekVols.length - 1 ? ' week-fill--current' : '')}
                  style={{ width: Math.round((vol / maxWeekVol) * 100) + '%' }}
                />
              </div>
              <div className="week-vol">{fmtVolK(vol)} kg</div>
            </div>
          ))}
        </div>
      </div>

      <div className="stack">
        <div className="section-label">Recordes pessoais</div>
        {prs.length === 0 ? (
          <div className="empty-card">
            <div className="empty-title">Nenhum recorde ainda</div>
            <div className="empty-sub">Conclua treinos para registrar seus PRs.</div>
          </div>
        ) : (
          prs.map(([name, s]) => (
            <div className="session-row" key={name}>
              <div className="pr-name">{name}</div>
              <div className="pr-kg">{fmtKg(s.pr)} kg</div>
              <div className="pr-date">{s.prDate ? fmtDate(s.prDate) : ''}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
