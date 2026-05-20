import type { Translation } from '../i18n/translations'

type HomePageProps = {
  openShiftCount: number
  storeName: string | null
  t: Translation
  onOpenStoreRequests: () => void
  onOpenInvoice: () => void
  onOpenAttendance: () => void
  onOpenPlanograms: () => void
  onOpenPhotoReport: () => void
  onOpenStoreTasks: () => void
  onOpenPhotoTasks: () => void
  onOpenSettings: () => void
  incomingMessageCount: number
  incomingPhotoTaskCount: number
  statusMessage?: string | null
}

type OperationItem = {
  title: string
  subtitle: string
  action: () => void
  badgeCount?: number
  priority?: 'primary' | 'standard' | 'quiet'
}

function HomePage({
  openShiftCount,
  storeName,
  t,
  onOpenStoreRequests,
  onOpenInvoice,
  onOpenAttendance,
  onOpenPlanograms,
  onOpenPhotoReport,
  onOpenStoreTasks,
  onOpenPhotoTasks,
  onOpenSettings,
  incomingMessageCount,
  incomingPhotoTaskCount,
  statusMessage,
}: HomePageProps) {
  const operationItems: OperationItem[] = [
    {
      title: 'Накладна',
      subtitle: 'Сфотографувати і надіслати',
      action: onOpenInvoice,
      priority: 'primary',
    },
    {
      title: 'Табель',
      subtitle: 'Прихід / вихід',
      action: onOpenAttendance,
      priority: 'primary',
    },
    {
      title: 'Фотозвіт',
      subtitle: 'Зробити фото магазину',
      action: onOpenPhotoReport,
      priority: 'primary',
    },
    {
      title: 'Фото-завдання',
      subtitle: 'Доручення по фото',
      action: onOpenPhotoTasks,
      badgeCount: incomingPhotoTaskCount,
      priority: incomingPhotoTaskCount > 0 ? 'primary' : 'standard',
    },
    {
      title: 'Планограми',
      subtitle: 'Переглянути викладку',
      action: onOpenPlanograms,
      priority: 'standard',
    },
    {
      title: 'Повідомлення',
      subtitle: 'Від офісу',
      action: onOpenStoreTasks,
      badgeCount: incomingMessageCount,
      priority: incomingMessageCount > 0 ? 'primary' : 'standard',
    },
    {
      title: 'Допомога',
      subtitle: 'Каса, техніка, питання',
      action: onOpenStoreRequests,
      priority: 'quiet',
    },
  ]

  return (
    <main className="app-shell terminal-home-shell">
      {statusMessage && <div className="message-box success home-success-message">{statusMessage}</div>}

      <section className="terminal-home-header">
        <div className="terminal-home-topbar">
          <p className="app-kicker">PROMIN STORE</p>
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
        </div>
        <h1>Робоче місце магазину</h1>
        <p>{storeName ?? 'Магазин не визначено'}</p>
        <strong>
          На зміні: {openShiftCount} {t.home.onShift}
        </strong>
      </section>

      <section className="terminal-action-grid" aria-label="Основні операції магазину">
        {operationItems.map((item) => (
          <button key={item.title} type="button" className={`terminal-action-card ${item.priority === 'primary' ? 'is-primary' : item.priority === 'quiet' ? 'is-quiet' : ''}`} onClick={item.action}>
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

    </main>
  )
}

export default HomePage
