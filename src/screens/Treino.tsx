import { useApp, useTick } from '../state/AppState'
import { e1rm, fmtElapsed, fmtInt, fmtKg, parseNum, parseReps } from '../lib/format'

function chipLabel(index: number, name: string): string {
  return index + 1 + ' ' + (name.length > 14 ? name.slice(0, 13) + '…' : name)
}

function NoActive() {
  const { fichas, startFicha } = useApp()
  return (
    <div className="screen">
      <div className="screen-title">Treino</div>
      <div className="empty-card">
        <div className="empty-title">Nenhum treino em andamento</div>
        <div className="empty-sub">
          {fichas.length === 0
            ? 'Crie uma ficha na aba Início para começar a registrar.'
            : 'Escolha uma ficha para começar a registrar.'}
        </div>
      </div>
      <div className="stack">
        {fichas.map((f) => (
          <div className="ficha-card" key={f.id}>
            <div className="ficha-badge">{f.letter}</div>
            <div className="ficha-info">
              <div className="ficha-name">{f.grupo}</div>
              <div className="ficha-sub">{f.exercises.length} exercícios</div>
            </div>
            <button className="btn-start" onClick={() => startFicha(f)}>
              Iniciar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Treino() {
  const { active, stats, profile, updateActive, toggleSet, finishWorkout, abandonWorkout, startRest } = useApp()
  const now = useTick(active !== null, 1000)

  if (!active) return <NoActive />

  const ex = active.exercises[active.exIndex]
  const exStats = stats.get(ex.name)
  const elapsedSecs = Math.max(0, Math.floor((now - active.startTs) / 1000))
  const restSecs = profile?.descansoSegundos ?? 90

  const hasTechnique = (ex.technique ?? '') !== ''
  let exVol = 0
  let maxDoneKg = 0
  for (const s of ex.sets) {
    if (s.done) {
      exVol += parseNum(s.kg) * parseReps(s.reps).total
      maxDoneKg = Math.max(maxDoneKg, parseNum(s.kg))
    }
  }
  const pr = exStats?.pr ?? 0
  const newPr = maxDoneKg > 0 && maxDoneKg > pr

  return (
    <div className="workout-screen">
      <div className="workout-header">
        <button
          className="btn-abandon"
          onClick={() => {
            if (window.confirm('Descartar este treino?')) abandonWorkout()
          }}
        >
          ✕
        </button>
        <div className="workout-title">
          <div className="workout-ficha-label">
            Treino {active.fichaLetter} · {active.grupo}
          </div>
          <div className="workout-timer">{fmtElapsed(elapsedSecs)}</div>
        </div>
        <button className="btn-finish" onClick={finishWorkout}>
          ✓
        </button>
      </div>

      <div className="chip-row">
        {active.exercises.map((e, i) => {
          const allDone = e.sets.length > 0 && e.sets.every((s) => s.done)
          const cur = i === active.exIndex
          return (
            <button
              key={i}
              className={'chip' + (cur ? ' chip--active' : allDone ? ' chip--done' : '')}
              onClick={() => updateActive((a) => void (a.exIndex = i))}
            >
              {chipLabel(i, e.name)}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="ex-header">
          <div className="ex-name">{ex.name}</div>
          <div className="ex-pos">
            {active.exIndex + 1}/{active.exercises.length} exercícios
          </div>
        </div>
        <div className="pill-row">
          {hasTechnique && <div className="pill pill--technique">{ex.technique}</div>}
          <div className="pill pill--accent">PR: {pr > 0 ? fmtKg(pr) + ' kg' : '—'}</div>
          <div className="pill">
            Último:{' '}
            {exStats && exStats.lastKg > 0
              ? `${fmtKg(exStats.lastKg)} × ${exStats.lastRepsText || exStats.lastReps}`
              : '—'}
          </div>
          <div className="pill">Vol: {fmtInt(exVol)} kg</div>
          {newPr && <div className="pill pill--pr">NOVO PR</div>}
        </div>
      </div>

      <div className="sets-block">
        <div className="set-grid set-head">
          <div>Set</div>
          <div className="t-center">kg</div>
          <div className="t-center">reps</div>
          <div className="t-center">e1RM</div>
          <div></div>
        </div>
        {ex.sets.map((s, i) => {
          const kg = parseNum(s.kg)
          // Com técnica, "6+2/2/2" → e1RM considera só o bloco principal (6)
          const est = e1rm(kg, parseReps(s.reps).main)
          return (
            <div key={i} className={'set-grid set-row' + (s.done ? ' set-row--done' : '')}>
              <div className="set-num">{i + 1}</div>
              <input
                className="set-input"
                inputMode="decimal"
                value={s.kg}
                onChange={(e) => updateActive((a) => void (a.exercises[a.exIndex].sets[i].kg = e.target.value))}
              />
              <input
                className={'set-input' + (hasTechnique ? ' set-input--detail' : '')}
                inputMode={hasTechnique ? 'text' : 'numeric'}
                placeholder={hasTechnique ? '6+2/2/2' : ''}
                value={s.reps}
                onChange={(e) => updateActive((a) => void (a.exercises[a.exIndex].sets[i].reps = e.target.value))}
              />
              <div className="set-e1rm">{est > 0 ? fmtKg(Math.round(est * 10) / 10) : '—'}</div>
              <button className={'set-check' + (s.done ? ' set-check--done' : '')} onClick={() => toggleSet(i)}>
                ✓
              </button>
            </div>
          )
        })}
        <div className="set-actions">
          <button
            className="btn-add-set"
            onClick={() =>
              updateActive((a) => {
                const sets = a.exercises[a.exIndex].sets
                const last = sets[sets.length - 1] ?? { kg: '', reps: '', done: false }
                sets.push({ kg: last.kg, reps: last.reps, done: false })
              })
            }
          >
            + Série
          </button>
          <button
            className="btn-remove-set"
            onClick={() =>
              updateActive((a) => {
                const sets = a.exercises[a.exIndex].sets
                if (sets.length > 1) sets.pop()
              })
            }
          >
            −
          </button>
        </div>
      </div>

      <textarea
        className="ex-note"
        placeholder="Nota do exercício…"
        rows={2}
        value={ex.note}
        onChange={(e) => updateActive((a) => void (a.exercises[a.exIndex].note = e.target.value))}
      />

      <div className="workout-footer">
        <button className="btn-rest" onClick={startRest}>
          Descanso {restSecs}s
        </button>
        <button
          className="btn-next-ex"
          onClick={() => updateActive((a) => void (a.exIndex = Math.min(a.exIndex + 1, a.exercises.length - 1)))}
        >
          →
        </button>
      </div>
    </div>
  )
}
