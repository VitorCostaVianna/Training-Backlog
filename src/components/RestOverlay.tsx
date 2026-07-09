import { useApp, useTick } from '../state/AppState'

export function RestOverlay() {
  const { restUntil, cancelRest } = useApp()
  const now = useTick(restUntil !== null, 1000)
  if (restUntil === null || restUntil <= now) return null
  const left = Math.ceil((restUntil - now) / 1000)
  return (
    <div className="rest-pill">
      <div className="rest-count">{left}s</div>
      <div className="rest-word">DESCANSO</div>
      <button className="rest-cancel" onClick={cancelRest}>
        ✕
      </button>
    </div>
  )
}
