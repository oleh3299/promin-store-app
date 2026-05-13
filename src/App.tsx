import './App.css'

type MenuItem = {
  title: string
  subtitle: string
  active?: boolean
}

const menuItems: MenuItem[] = [
  {
    title: 'Табель',
    subtitle: 'Приход / уход сотрудников',
    active: true,
  },
  {
    title: 'Кто на смене',
    subtitle: 'В разработке',
  },
  {
    title: 'Задания',
    subtitle: 'В разработке',
  },
  {
    title: 'Фотоотчёты',
    subtitle: 'В разработке',
  },
  {
    title: 'Скан товара',
    subtitle: 'В разработке',
  },
  {
    title: 'Печать ценников',
    subtitle: 'В разработке',
  },
  {
    title: 'Контроль открытия',
    subtitle: 'В разработке',
  },
  {
    title: 'Тревожная кнопка IT',
    subtitle: 'В разработке',
  },
  {
    title: 'Показатели смены',
    subtitle: 'В разработке',
  },
]

function App() {
  const handleClick = (item: MenuItem) => {
    if (!item.active) {
      alert('Раздел в разработке')
      return
    }

    alert('Открываем модуль табеля')
  }

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
          <strong>Не выбран</strong>
        </div>
      </section>

      <section className="status-card">
        <div>
          <p>Сегодня</p>
          <strong>Табель не открыт</strong>
        </div>
        <button type="button">Выбрать магазин</button>
      </section>

      <section className="menu-grid">
        {menuItems.map((item) => (
          <button
            key={item.title}
            type="button"
            className={item.active ? 'menu-card active' : 'menu-card'}
            onClick={() => handleClick(item)}
          >
            <span>{item.title}</span>
            <small>{item.subtitle}</small>
          </button>
        ))}
      </section>
    </main>
  )
}

export default App