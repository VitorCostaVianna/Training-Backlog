import { useApp } from '../state/AppState'
import type { Tab } from '../lib/types'

const TABS: { key: Tab; label: string }[] = [
  { key: 'inicio', label: 'Início' },
  { key: 'treino', label: 'Treino' },
  { key: 'progresso', label: 'Progresso' },
  { key: 'agenda', label: 'Agenda' },
]

export function TabBar() {
  const { tab, setTab } = useApp()
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={'tab-item' + (tab === t.key ? ' tab-item--active' : '')}
          onClick={() => setTab(t.key)}
        >
          <div className="tab-indicator" />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
