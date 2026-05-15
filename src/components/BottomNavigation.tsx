import type { Screen } from '../types/attendance'

type BottomNavItem = {
  label: string
  screen: Screen
  icon: 'home' | 'attendance' | 'scanner' | 'tasks' | 'profile'
}

type BottomNavigationProps = {
  activeScreen: Screen
  onNavigate: (screen: Screen) => void
}

const items: BottomNavItem[] = [
  { label: 'Головна', screen: 'home', icon: 'home' },
  { label: 'Табель', screen: 'attendance', icon: 'attendance' },
  { label: 'Сканер', screen: 'scanner', icon: 'scanner' },
  { label: 'Завдання', screen: 'storeTasks', icon: 'tasks' },
  { label: 'Профіль', screen: 'profile', icon: 'profile' },
]

function NavIcon({ icon }: { icon: BottomNavItem['icon'] }) {
  if (icon === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.2 12 4l8 7.2" />
        <path d="M6.5 10.5V20h11v-9.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    )
  }

  if (icon === 'attendance') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.8h10a2 2 0 0 1 2 2V20H5V5.8a2 2 0 0 1 2-2Z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    )
  }

  if (icon === 'scanner') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 8V5h3" />
        <path d="M16 5h3v3" />
        <path d="M19 16v3h-3" />
        <path d="M8 19H5v-3" />
        <path d="M8 12h8" />
        <path d="M10 9v6" />
        <path d="M14 9v6" />
      </svg>
    )
  }

  if (icon === 'tasks') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5h10" />
        <path d="M8 12h10" />
        <path d="M8 19h10" />
        <path d="m4 5 1 1 1.7-2" />
        <path d="m4 12 1 1 1.7-2" />
        <path d="m4 19 1 1 1.7-2" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

function BottomNavigation({ activeScreen, onNavigate }: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="Основна навігація">
      {items.map((item) => {
        const isActive = activeScreen === item.screen
        const isPrimary = item.screen === 'scanner'

        return (
          <button
            key={item.screen}
            type="button"
            className={[
              'bottom-nav-item',
              isActive ? 'active' : '',
              isPrimary ? 'primary' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onNavigate(item.screen)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">
              <NavIcon icon={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNavigation
