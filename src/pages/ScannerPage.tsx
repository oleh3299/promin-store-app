import type { DeviceState } from '../types/attendance'

type ScannerPageProps = {
  device: DeviceState
}

function ScannerPage({ device }: ScannerPageProps) {
  return (
    <main className="app-shell scanner-home">
      <section className="app-header vertical">
        <p className="app-kicker">Promin Store</p>
        <h1>Сканер</h1>
        <p className="app-subtitle">
          Робочий сканер товарів для перевірки ціни, залишку та наявності у магазині.
        </p>
      </section>

      <section className="scanner-action-panel">
        <div className="scanner-frame-large" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div>
          <strong>Готово до сканування</strong>
          <p>{device.storeName ?? 'Поточний магазин не визначено'}</p>
        </div>
      </section>

      <section className="panel scanner-placeholder-card">
        <h2>Дані після сканування</h2>
        <div className="product-info-grid">
          <div>
            <span>Назва</span>
            <strong>Очікує товар</strong>
          </div>
          <div>
            <span>Ціна</span>
            <strong>--</strong>
          </div>
          <div>
            <span>Залишок</span>
            <strong>--</strong>
          </div>
          <div>
            <span>Наявність</span>
            <strong>--</strong>
          </div>
        </div>
      </section>
    </main>
  )
}

export default ScannerPage
