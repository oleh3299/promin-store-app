import type { Translation } from '../i18n/translations'

type HomePageProps = {
  openShiftCount: number
  storeName: string | null
  t: Translation
  onOpenStoreRequests: () => void
  onOpenInvoice: () => void
  onOpenAttendance: () => void
  onOpenPlanograms: () => void
  onOpenStoreTasks: () => void
  onOpenSettings: () => void
  incomingMessageCount: number
}

type OperationItem = {
  title: string
  subtitle: string
  action: () => void
  badgeCount?: number
}

function HomePage({
  openShiftCount,
  storeName,
  t,
  onOpenStoreRequests,
  onOpenInvoice,
  onOpenAttendance,
  onOpenPlanograms,
  onOpenStoreTasks,
  onOpenSettings,
  incomingMessageCount,
}: HomePageProps) {
  const operationItems: OperationItem[] = [
    {
      title: 'Відправити накладну',
      subtitle: 'Фото накладної в бухгалтерію',
      action: onOpenInvoice,
    },
    {
      title: 'Табель',
      subtitle: 'Прихід, вихід, скан штрихкоду',
      action: onOpenAttendance,
    },
    {
      title: 'Планограми',
      subtitle: 'Актуальна викладка магазину',
      action: onOpenPlanograms,
    },
    {
      title: 'Повідомлення',
      subtitle: 'Нові повідомлення від бухгалтерії, IT, адміністрації',
      action: onOpenStoreTasks,
      badgeCount: incomingMessageCount,
    },
    {
      title: "Зв'язок",
      subtitle: 'Бухгалтерія, технічна служба, адміністрація',
      action: onOpenStoreRequests,
    },
  ]

  return (
    <main className="app-shell terminal-home-shell">
      <section className="terminal-home-header">
        <p className="app-kicker">Promin Store</p>
        <h1>Робоче місце магазину</h1>
        <p>{storeName ?? 'Магазин не визначено'}</p>
        <strong>
          На зміні: {openShiftCount} {t.home.onShift}
        </strong>
      </section>

      <section className="terminal-action-grid" aria-label="Основні операції магазину">
        {operationItems.map((item) => (
          <button key={item.title} type="button" className="terminal-action-card" onClick={item.action}>
            <span>
              {item.title}
              {item.badgeCount ? (
                <strong className="home-card-badge" aria-label={`Нові повідомлення: ${item.badgeCount}`}>
                  <i />
                  {item.badgeCount}
                </strong>
              ) : null}
            </span>
            <small>{item.subtitle}</small>
          </button>
        ))}
      </section>

      <button
        type="button"
        className="home-settings-button"
        aria-label="Налаштування"
        onClick={onOpenSettings}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.04.04a2.05 2.05 0 0 1-2.9 2.9l-.04-.04A1.7 1.7 0 0 0 15 19.43a1.7 1.7 0 0 0-1 .5 1.7 1.7 0 0 0-.5 1.2V21a2.05 2.05 0 0 1-4.1 0v-.07a1.7 1.7 0 0 0-.5-1.2 1.7 1.7 0 0 0-1-.5 1.7 1.7 0 0 0-1.87.34l-.04.04a2.05 2.05 0 1 1-2.9-2.9l.04-.04A1.7 1.7 0 0 0 3.47 15a1.7 1.7 0 0 0-.5-1 1.7 1.7 0 0 0-1.2-.5H1.7a2.05 2.05 0 0 1 0-4.1h.07a1.7 1.7 0 0 0 1.2-.5 1.7 1.7 0 0 0 .5-1 1.7 1.7 0 0 0-.34-1.87l-.04-.04a2.05 2.05 0 1 1 2.9-2.9l.04.04A1.7 1.7 0 0 0 7.9 3.47a1.7 1.7 0 0 0 1-.5 1.7 1.7 0 0 0 .5-1.2V1.7a2.05 2.05 0 0 1 4.1 0v.07a1.7 1.7 0 0 0 .5 1.2 1.7 1.7 0 0 0 1 .5 1.7 1.7 0 0 0 1.87-.34l.04-.04a2.05 2.05 0 0 1 2.9 2.9l-.04.04A1.7 1.7 0 0 0 19.43 7.9a1.7 1.7 0 0 0 .5 1 1.7 1.7 0 0 0 1.2.5h.07a2.05 2.05 0 0 1 0 4.1h-.07a1.7 1.7 0 0 0-1.2.5 1.7 1.7 0 0 0-.53 1Z" />
        </svg>
      </button>
    </main>
  )
}

export default HomePage
