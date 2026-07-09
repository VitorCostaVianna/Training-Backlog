import { useApp } from '../state/AppState'

function Stepper({
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  unit: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="stepper">
      <button className="stepper-btn" onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <div className="stepper-value">
        {value}
        {unit}
      </div>
      <button className="stepper-btn" onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </div>
  )
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { profile, email, updateSettings, signOut } = useApp()
  const descanso = profile?.descansoSegundos ?? 90
  const auto = profile?.descansoAutomatico ?? true
  const meta = profile?.metaSemanal ?? 4

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="section-label">Configurações</div>
          <button className="sheet-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Descanso</div>
            <div className="setting-sub">entre séries</div>
          </div>
          <Stepper value={descanso} unit="s" min={30} max={300} step={15} onChange={(v) => updateSettings({ descansoSegundos: v })} />
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Descanso automático</div>
            <div className="setting-sub">inicia ao marcar uma série</div>
          </div>
          <button
            className={'switch' + (auto ? ' switch--on' : '')}
            onClick={() => updateSettings({ descansoAutomatico: !auto })}
            aria-pressed={auto}
          >
            <div className="switch-knob" />
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Meta semanal</div>
            <div className="setting-sub">treinos por semana</div>
          </div>
          <Stepper value={meta} unit="" min={1} max={7} step={1} onChange={(v) => updateSettings({ metaSemanal: v })} />
        </div>

        <button className="btn-signout" onClick={signOut}>
          Sair da conta
        </button>
        <div className="sheet-email">{email}</div>
      </div>
    </div>
  )
}
