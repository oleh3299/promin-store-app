import {
  languageCodes,
  translations,
  type Language,
  type Translation,
} from '../i18n/translations'

type HomePageProps = {
  openShiftCount: number
  language: Language
  t: Translation
  onLanguageChange: (language: Language) => void
  onOpenAttendance: () => void
  onOpenSettings: () => void
  onOpenDiagnostics: () => void
}

type MenuItem = {
  title: string
  subtitle: string
  action: 'attendance' | 'settings' | 'diagnostics' | 'disabled'
}

function getMenuItems(t: Translation): MenuItem[] {
  return [
    {
      title: t.home.menu.attendance,
      subtitle: t.home.menu.attendanceSubtitle,
      action: 'attendance',
    },
    {
      title: t.home.menu.settings,
      subtitle: t.home.menu.settingsSubtitle,
      action: 'settings',
    },
    {
      title: t.home.menu.diagnostics,
      subtitle: t.home.menu.diagnosticsSubtitle,
      action: 'diagnostics',
    },
    {
      title: t.home.menu.currentShift,
      subtitle: t.home.inDevelopment,
      action: 'disabled',
    },
    { title: t.home.menu.tasks, subtitle: t.home.inDevelopment, action: 'disabled' },
    {
      title: t.home.menu.photoReports,
      subtitle: t.home.inDevelopment,
      action: 'disabled',
    },
    {
      title: t.home.menu.productScan,
      subtitle: t.home.inDevelopment,
      action: 'disabled',
    },
    {
      title: t.home.menu.priceTags,
      subtitle: t.home.inDevelopment,
      action: 'disabled',
    },
    {
      title: t.home.menu.openingControl,
      subtitle: t.home.inDevelopment,
      action: 'disabled',
    },
    {
      title: t.home.menu.itPanicButton,
      subtitle: t.home.inDevelopment,
      action: 'disabled',
    },
    {
      title: t.home.menu.shiftMetrics,
      subtitle: t.home.inDevelopment,
      action: 'disabled',
    },
  ]
}

function HomePage({
  openShiftCount,
  language,
  t,
  onLanguageChange,
  onOpenAttendance,
  onOpenSettings,
  onOpenDiagnostics,
}: HomePageProps) {
  const menuItems = getMenuItems(t)

  return (
    <main className="app-shell">
      <section className="app-header home-header">
        <div className="home-title">
          <p className="app-kicker">Promin Store</p>
          <h1>{t.home.title}</h1>
        </div>

        <div className="language-switcher" aria-label="Language">
          {languageCodes.map((code) => (
            <button
              key={code}
              type="button"
              className={language === code ? 'selected' : undefined}
              onClick={() => onLanguageChange(code)}
              aria-label={translations[code].language.name}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="status-card">
        <div>
          <p>{t.home.today}</p>
          <strong>
            {openShiftCount} {t.home.onShift}
          </strong>
        </div>
        <button type="button">{t.home.activeDevice}</button>
      </section>

      <section className="menu-grid">
        {menuItems.map((item) => (
          <button
            key={item.title}
            type="button"
            className={
              item.action === 'disabled' ? 'menu-card' : 'menu-card active'
            }
            onClick={() => {
              if (item.action === 'attendance') {
                onOpenAttendance()
                return
              }

              if (item.action === 'settings') {
                onOpenSettings()
                return
              }

              if (item.action === 'diagnostics') {
                onOpenDiagnostics()
                return
              }

              alert(t.home.inDevelopment)
            }}
          >
            <span>{item.title}</span>
            <small>{item.subtitle}</small>
          </button>
        ))}
      </section>
    </main>
  )
}

export default HomePage
