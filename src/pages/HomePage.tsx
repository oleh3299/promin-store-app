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
      title: "Зв'язок",
      subtitle: 'Бухгалтерія, IT, адміністрація',
      action: onOpenStoreRequests,
    },
    {
      title: 'Повідомлення',
      subtitle: 'Нові повідомлення від бухгалтерії, IT, адміністрації',
      action: onOpenStoreTasks,
      badgeCount: incomingMessageCount,
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
    </main>
  )
}

export default HomePage
