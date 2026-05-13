import {
  languageCodes,
  translations,
  type Language,
  type Translation,
} from '../i18n/translations'
import {
  isStandaloneMode,
  requestNotificationPermission,
  showTestNotification,
} from '../lib/pwa'

type HomePageProps = {
  openShiftCount: number
  notificationStatus: string
  selectedStore: string
  language: Language
  t: Translation
  onLanguageChange: (language: Language) => void
  onNotificationStatusChange: (status: string) => void
  onOpenAttendance: () => void
}

type MenuItem = {
  title: string
  subtitle: string
  active?: boolean
}

function getMenuItems(t: Translation): MenuItem[] {
  return [
    {
      title: t.home.menu.attendance,
      subtitle: t.home.menu.attendanceSubtitle,
      active: true,
    },
    { title: t.home.menu.currentShift, subtitle: t.home.inDevelopment },
    { title: t.home.menu.tasks, subtitle: t.home.inDevelopment },
    { title: t.home.menu.photoReports, subtitle: t.home.inDevelopment },
    { title: t.home.menu.productScan, subtitle: t.home.inDevelopment },
    { title: t.home.menu.priceTags, subtitle: t.home.inDevelopment },
    { title: t.home.menu.openingControl, subtitle: t.home.inDevelopment },
    { title: t.home.menu.itPanicButton, subtitle: t.home.inDevelopment },
    { title: t.home.menu.shiftMetrics, subtitle: t.home.inDevelopment },
  ]
}

function HomePage({
  openShiftCount,
  notificationStatus,
  selectedStore,
  language,
  t,
  onLanguageChange,
  onNotificationStatusChange,
  onOpenAttendance,
}: HomePageProps) {
  const menuItems = getMenuItems(t)

  return (
    <main className="app-shell">
      <section className="app-header">
        <div>
          <p className="app-kicker">Promin Store</p>
          <h1>{t.home.title}</h1>
          <p className="app-subtitle">{t.home.subtitle}</p>
        </div>

        <div className="store-badge">
          <span>{t.home.storeLabel}</span>
          <strong>{selectedStore}</strong>

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

      <section className="panel">
        <h2>{t.home.appTitle}</h2>

        <div className="pwa-status">
          <span>{t.home.modeLabel}</span>
          <strong>
            {isStandaloneMode() ? t.home.standaloneMode : t.home.browserMode}
          </strong>
        </div>

        <div className="pwa-status">
          <span>Push</span>
          <strong>{notificationStatus}</strong>
        </div>

        <button
          className="wide-button"
          onClick={async () => {
            const result = await requestNotificationPermission()
            onNotificationStatusChange(result)
          }}
        >
          {t.home.allowNotifications}
        </button>

        <button
          className="wide-button secondary"
          onClick={() => showTestNotification(t.pwa)}
        >
          {t.home.testNotification}
        </button>
      </section>

      <section className="menu-grid">
        {menuItems.map((item) => (
          <button
            key={item.title}
            type="button"
            className={item.active ? 'menu-card active' : 'menu-card'}
            onClick={() => {
              if (item.active) {
                onOpenAttendance()
              } else {
                alert(t.home.inDevelopment)
              }
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
