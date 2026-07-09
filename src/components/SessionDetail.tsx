import type { Session } from '../lib/types'
import { e1rm, fmtInt, fmtKg, parseReps } from '../lib/format'

function fullDate(iso: string): string {
  const p = iso.split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

/** Detalhe (somente leitura) de um treino do histórico: séries, cargas, e1RM e notas. */
export function SessionDetail({ session, onClose }: { session: Session; onClose: () => void }) {
  const totalSets = session.exercises.reduce((n, ex) => n + ex.sets.length, 0)

  return (
    <div className="editor-screen">
      <div className="editor-inner">
        <div className="workout-header">
          <button className="btn-abandon" onClick={onClose}>
            ✕
          </button>
          <div style={{ textAlign: 'center' }}>
            <div className="workout-ficha-label">
              Treino {session.fichaLetter} · {session.grupo}
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {fullDate(session.date)}
            </div>
          </div>
          <div style={{ width: 36 }} />
        </div>

        <div className="stat-row">
          <div className="stat-card">
            <div className="micro-label">Volume</div>
            <div className="stat-value stat-value--accent" style={{ fontSize: 17 }}>
              {fmtInt(session.volume)}
              <span className="stat-unit"> kg</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="micro-label">Duração</div>
            <div className="stat-value" style={{ fontSize: 17 }}>
              {session.durationMin}
              <span className="stat-unit"> min</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="micro-label">Séries</div>
            <div className="stat-value" style={{ fontSize: 17 }}>
              {totalSets}
            </div>
          </div>
        </div>

        {session.exercises.length === 0 ? (
          <div className="empty-card">
            <div className="empty-title">Sem séries registradas</div>
            <div className="empty-sub">Este treino foi salvo sem detalhes de séries.</div>
          </div>
        ) : (
          <div className="stack">
            <div className="section-label">Exercícios</div>
            {session.exercises.map((ex) => (
              <div className="detail-ex-card" key={ex.id}>
                <div className="detail-ex-head">
                  <div className="detail-ex-name">{ex.name}</div>
                  {ex.technique && <div className="pill pill--technique">{ex.technique}</div>}
                </div>
                {ex.sets.map((s) => {
                  const repsText = s.repsDetail || String(s.reps)
                  const est = e1rm(s.kg, parseReps(repsText).main)
                  return (
                    <div className="detail-set-row" key={s.id}>
                      <div className="detail-set-num">{s.setNumber}</div>
                      <div className="detail-set-load">
                        {fmtKg(s.kg)} kg × {repsText}
                      </div>
                      <div className="detail-set-e1rm">{est > 0 ? 'e1RM ' + fmtKg(Math.round(est * 10) / 10) : ''}</div>
                    </div>
                  )
                })}
                {ex.note && <div className="detail-ex-note">{ex.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
