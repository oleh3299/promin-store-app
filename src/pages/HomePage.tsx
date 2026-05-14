import {
  languageCodes,
  translations,
  type Language,
  type Translation,
} from '../i18n/translations'

type HomePageProps = {
  openShiftCount: number
  storeName: string | null
  language: Language
  t: Translation
  onLanguageChange: (language: Language) => void
  onOpenAttendance: () => void
  onOpenStoreRequests: () => void
  onOpenInvoice: () => void
  onOpenPhotoReport: () => void
  onOpenPlanograms: () => void
  onOpenSettings: () => void
}

type MenuItem = {
  title: string
  subtitle: string
  action: 'attendance' | 'storeRequests' | 'invoice' | 'photoReport' | 'planograms' | 'settings'
}

function getMenuItems(t: Translation): MenuItem[] {
  return [
    {
      title: t.home.menu.attendance,
      subtitle: t.home.menu.attendanceSubtitle,
      action: 'attendance',
    },
    {
      title: t.home.menu.storeRequests,
      subtitle: t.home.menu.storeRequestsSubtitle,
      action: 'storeRequests',
    },
    {
      title: t.home.menu.invoice,
      subtitle: t.home.menu.invoiceSubtitle,
      action: 'invoice',
    },
    {
      title: t.home.menu.photoReport,
      subtitle: t.home.menu.photoReportSubtitle,
      action: 'photoReport',
    },
    {
      title: t.home.menu.planograms,
      subtitle: t.planograms.subtitle,
      action: 'planograms',
    },
    {
      title: t.home.menu.settings,
      subtitle: t.home.menu.settingsSubtitle,
      action: 'settings',
    },
  ]
}

function HomePage({
  openShiftCount,
  storeName,
  language,
  t,
  onLanguageChange,
  onOpenAttendance,
  onOpenStoreRequests,
  onOpenInvoice,
  onOpenPhotoReport,
  onOpenPlanograms,
  onOpenSettings,
}: HomePageProps) {
  const menuItems = getMenuItems(t)

  return (
    <main className="app-shell">
      <section className="app-header home-header">
        <div className="home-title">
          <p className="app-kicker">Promin Store</p>
          <h1>{t.home.title}</h1>
          {storeName && <p className="home-store-name">{storeName}</p>}
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
              'menu-card active'
            }
            onClick={() => {
              if (item.action === 'attendance') {
                onOpenAttendance()
                return
              }

              if (item.action === 'storeRequests') {
                onOpenStoreRequests()
                return
              }

              if (item.action === 'invoice') {
                onOpenInvoice()
                return
              }

              if (item.action === 'photoReport') {
                onOpenPhotoReport()
                return
              }

              if (item.action === 'planograms') {
                onOpenPlanograms()
                return
              }

              if (item.action === 'settings') {
                onOpenSettings()
                return
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
