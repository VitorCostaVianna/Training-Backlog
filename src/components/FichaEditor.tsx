import { useState } from 'react'
import { useApp } from '../state/AppState'
import type { Ficha } from '../lib/types'

interface DraftRow {
  id: string
  name: string
  setsCount: number
  technique: string
}

const TECHNIQUES = ['Cluster Set', 'Myo Reps', 'Drop Set', 'Rest-Pause', 'Bi-Set', 'Até a Falha']

function newRow(): DraftRow {
  return { id: crypto.randomUUID(), name: '', setsCount: 3, technique: '' }
}

function nextLetter(used: string[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const l of alphabet) if (!used.includes(l)) return l
  return String(used.length + 1)
}

function ChevronUp() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 7.5 6 3.5l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 4.5 6 8.5l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <path d="M2 2l7 7M9 2 2 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Editor de ficha em tela cheia — criar, renomear, adicionar/remover/reordenar exercícios, arquivar. */
export function FichaEditor({ ficha, onClose }: { ficha: Ficha | null; onClose: () => void }) {
  const { fichas, saveFicha, archiveFicha } = useApp()
  const isNew = ficha === null
  const letter = ficha?.letter ?? nextLetter(fichas.map((f) => f.letter))

  const [grupo, setGrupo] = useState(ficha?.grupo ?? '')
  const [rows, setRows] = useState<DraftRow[]>(
    ficha && ficha.exercises.length > 0
      ? ficha.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          setsCount: e.setsCount ?? 3,
          technique: e.technique ?? '',
        }))
      : [newRow()]
  )
  const [error, setError] = useState('')

  function patchRow(id: string, patch: Partial<DraftRow>) {
    setRows((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function move(index: number, delta: number) {
    const to = index + delta
    if (to < 0 || to >= rows.length) return
    const next = [...rows]
    ;[next[index], next[to]] = [next[to], next[index]]
    setRows(next)
  }

  function save() {
    const kept = rows.map((r) => ({ ...r, name: r.name.trim() })).filter((r) => r.name !== '')
    if (grupo.trim() === '') {
      setError('Dê um nome à ficha.')
      return
    }
    if (kept.length === 0) {
      setError('Adicione pelo menos um exercício.')
      return
    }
    const keptIds = new Set(kept.map((r) => r.id))
    const deleted = (ficha?.exercises ?? []).filter((e) => !keptIds.has(e.id)).map((e) => e.id)
    saveFicha(
      {
        id: ficha?.id ?? crypto.randomUUID(),
        letter,
        grupo: grupo.trim(),
        position: ficha?.position ?? (fichas.length > 0 ? Math.max(...fichas.map((f) => f.position)) + 1 : 0),
        exercises: kept.map((r, i) => ({
          id: r.id,
          name: r.name,
          position: i,
          setsCount: r.setsCount,
          technique: r.technique,
        })),
      },
      deleted
    )
    onClose()
  }

  function archive() {
    if (!ficha) return
    if (window.confirm(`Arquivar a ficha ${ficha.letter} · ${ficha.grupo}? O histórico de treinos é mantido.`)) {
      archiveFicha(ficha.id)
      onClose()
    }
  }

  return (
    <div className="editor-screen">
      <div className="editor-inner">
        <div className="workout-header">
          <button className="btn-abandon" onClick={onClose}>
            ✕
          </button>
          <div className="workout-ficha-label">{isNew ? 'Nova ficha' : 'Editar ficha'}</div>
          <button className="btn-finish" onClick={save}>
            ✓
          </button>
        </div>

        <div className="editor-grupo-row">
          <div className="ficha-badge">{letter}</div>
          <input
            className="editor-grupo-input"
            placeholder="Nome do grupo (ex. Peito e Tríceps)"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
            autoFocus={isNew}
          />
        </div>

        <div className="stack">
          <div className="section-label">Exercícios</div>
          {rows.map((r, i) => (
            <div className="editor-ex-row" key={r.id}>
              <div className="editor-ex-main">
                <div className="editor-ex-num">{i + 1}</div>
                <input
                  className="editor-ex-name"
                  placeholder="Nome do exercício"
                  value={r.name}
                  onChange={(e) => patchRow(r.id, { name: e.target.value })}
                />
                <button className="editor-ex-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima">
                  <ChevronUp />
                </button>
                <button className="editor-ex-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Mover para baixo">
                  <ChevronDown />
                </button>
                <button className="editor-ex-btn" onClick={() => setRows(rows.filter((x) => x.id !== r.id))} aria-label="Remover exercício">
                  <CrossIcon />
                </button>
              </div>
              <div className="editor-ex-opts">
                <div className="editor-sets-stepper">
                  <button className="editor-sets-btn" onClick={() => patchRow(r.id, { setsCount: Math.max(1, r.setsCount - 1) })}>
                    −
                  </button>
                  <div className="editor-sets-value">
                    {r.setsCount} {r.setsCount === 1 ? 'série' : 'séries'}
                  </div>
                  <button className="editor-sets-btn" onClick={() => patchRow(r.id, { setsCount: Math.min(10, r.setsCount + 1) })}>
                    +
                  </button>
                </div>
                <select
                  className={'editor-technique' + (r.technique ? ' has-value' : '')}
                  value={r.technique}
                  onChange={(e) => patchRow(r.id, { technique: e.target.value })}
                >
                  <option value="">Técnica: normal</option>
                  {TECHNIQUES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <button className="btn-add-set" onClick={() => setRows([...rows, newRow()])}>
            + Exercício
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {!isNew && (
          <button className="btn-archive" onClick={archive}>
            Arquivar ficha
          </button>
        )}
      </div>
    </div>
  )
}
