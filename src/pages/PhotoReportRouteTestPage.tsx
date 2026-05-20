import type { DeviceState } from '../types/attendance'

type PhotoReportRouteTestPageProps = {
  device: DeviceState
  onBack: () => void
}

function PhotoReportRouteTestPage({ device, onBack }: PhotoReportRouteTestPageProps) {
  const timestamp = new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Uzhgorod',
  }).format(new Date())

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        Назад
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">Діагностика</p>
        <h1>Тест контуру фотозвіту</h1>
        <p className="app-subtitle">Перевірка каналу photo-reports без заміни робочого фотозвіту.</p>
      </section>

      <section className="panel diagnostic-list">
        <div className="diagnostic-row">
          <span>Магазин</span>
          <strong>{device.storeName ?? device.storeCode ?? 'Не визначено'}</strong>
        </div>
        <div className="diagnostic-row">
          <span>route_key</span>
          <strong>photo_report</strong>
        </div>
        <div className="diagnostic-row">
          <span>room_name</span>
          <strong>Налаштовується у rocket_routes</strong>
        </div>
        <div className="diagnostic-row">
          <span>Час тесту</span>
          <strong>{timestamp}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>Надіслати тест</h2>
        <p className="app-subtitle">
          Backend endpoint для ручного тестового повідомлення ще не підключений. Робочий модуль
          “Фотозвіт” залишається окремим production flow.
        </p>
        <button className="wide-button secondary" disabled type="button">
          Надіслати тест
        </button>
      </section>
    </main>
  )
}

export default PhotoReportRouteTestPage
