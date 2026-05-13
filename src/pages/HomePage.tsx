import {
  isStandaloneMode,
  requestNotificationPermission,
  showTestNotification,
} from '../lib/pwa'

type HomePageProps = {
  openShiftCount: number
  notificationStatus: string
  onNotificationStatusChange: (status: string) => void
  onOpenAttendance: () => void
}

const menuItems = [
  { title: 'Табель', subtitle: 'Приход / уход сотрудников', active: true },
  { title: 'Кто на смене', subtitle: 'В разработке' },
  { title: 'Задания', subtitle: 'В разработке' },
  { title: 'Фотоотчёты', subtitle: 'В разработке' },
  { title: 'Скан товара', subtitle: 'В разработке' },
  { title: 'Печать ценников', subtitle: 'В разработке' },
  { title: 'Контроль открытия', subtitle: 'В разработке' },
  { title: 'Тревожная кнопка IT', subtitle: 'В разработке' },
  { title: 'Показатели смены', subtitle: 'В разработке' },
]

function HomePage({
  openShiftCount,
  notificationStatus,
  onNotificationStatusChange,
  onOpenAttendance,
}: HomePageProps) {
  return (
    <main className="app-shell">
      <section className="app-header">
        <div>
          <p className="app-kicker">Promin Store</p>
          <h1>Рабочее место магазина</h1>
          <p className="app-subtitle">
            Первый контур: табель сотрудников. Остальные модули подключим поэтапно.
          </p>
        </div>

        <div className="store-badge">
          <span>Магазин</span>
          <strong>М37</strong>
        </div>
      </section>

      <section className="status-card">
        <div>
          <p>Сегодня</p>
          <strong>{openShiftCount} на смене</strong>
        </div>
        <button type="button">Устройство активно</button>
      </section>

      <section className="panel">
        <h2>Приложение</h2>

        <div className="pwa-status">
          <span>Режим</span>
          <strong>
            {isStandaloneMode()
              ? 'Установлено как приложение'
              : 'Открыто в браузере'}
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
          Разрешить уведомления
        </button>

        <button className="wide-button secondary" onClick={showTestNotification}>
          Тест уведомления
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
                alert('Раздел в разработке')
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
