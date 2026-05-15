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
  onOpenStoreRequests: () => void
  onOpenInvoice: () => void
  onOpenPlanograms: () => void
  onOpenStoreTasks: () => void
}

type OperationItem = {
  title: string
  subtitle: string
  action: 'storeRequests' | 'invoice' | 'planograms' | 'storeTasks'
}

function getOperationItems(t: Translation): OperationItem[] {
  return [
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
      title: t.home.menu.planograms,
      subtitle: t.planograms.subtitle,
      action: 'planograms',
    },
    {
      title: 'Завдання',
      subtitle: 'Операційні завдання магазину',
      action: 'storeTasks',
    },
  ]
}

function HomePage({
  openShiftCount,
  storeName,
  language,
  t,
  onLanguageChange,
  onOpenStoreRequests,
  onOpenInvoice,
  onOpenPlanograms,
  onOpenStoreTasks,
}: HomePageProps) {
  const operationItems = getOperationItems(t)
  const storeStateItems = [
    {
      label: 'Відкриття магазину',
      value: 'Не перевірено',
    },
    {
      label: 'Фото зон',
      value: '0/8',
    },
    {
      label: 'Активні задачі',
      value: '0',
    },
    {
      label: 'Накладні в обробці',
      value: '0',
    },
  ]

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

      <section className="status-card home-status-card">
        <div>
          <p>{t.home.activeDevice}</p>
          <strong>{storeName ?? 'Promin Store'}</strong>
        </div>
        <div>
          <p>{t.home.today}</p>
          <strong>
            {openShiftCount} {t.home.onShift}
          </strong>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Стан магазину</h2>
        </div>
        <div className="store-state-grid">
          {storeStateItems.map((item) => (
            <article className="store-state-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Операції магазину</h2>
        </div>
        <div className="operation-grid">
          {operationItems.map((item) => (
            <button
              key={item.title}
              type="button"
              className="operation-card"
              onClick={() => {
                if (item.action === 'storeRequests') {
                  onOpenStoreRequests()
                  return
                }

                if (item.action === 'invoice') {
                  onOpenInvoice()
                  return
                }

                if (item.action === 'planograms') {
                  onOpenPlanograms()
                  return
                }

                if (item.action === 'storeTasks') {
                  onOpenStoreTasks()
                }
              }}
            >
              <span>{item.title}</span>
              <small>{item.subtitle}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

export default HomePage
