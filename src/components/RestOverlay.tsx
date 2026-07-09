import { useApp, useTick } from '../state/AppState'

export function RestOverlay() {
  const { restUntil, restDuration, cancelRest } = useApp()
  const now = useTick(restUntil !== null, 1000)
  if (restUntil === null || restUntil <= now) return null
  const leftMs = restUntil - now
  const left = Math.ceil(leftMs / 1000)
  // Preenchimento escuro que esvazia junto com o descanso — dá para ver de
  // longe quanto falta, sem ler o número.
  const pct = Math.max(0, Math.min(100, (leftMs / (restDuration * 1000)) * 100))
  return (
    <div className="rest-pill">
      <div className="rest-progress" style={{ width: pct + '%' }} />
      <div className="rest-count">{left}s</div>
      <div className="rest-word">DESCANSO</div>
      <button className="rest-cancel" onClick={cancelRest}>
        ✕
      </button>
    </div>
  )
}
