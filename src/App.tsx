import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import './App.css'
import {
  canUseNotifications,
  isStandaloneMode,
  requestNotificationPermission,
  showTestNotification,
} from './pwa'

type Screen = 'home' | 'attendance'
type AttendanceMode = 'checkin' | 'checkout' | null
type InputMethod = 'scan' | 'manual' | null
type Position = 'Ревізор' | 'Викладка / мерчендайзер' | 'Продавець'

type Employee = {
  id: string
  code: string
  name: string
}

type Shift = {
  employeeId: string
  employeeName: string
  position: Position
  checkInTime: string
  checkOutTime?: string
}

const employees: Employee[] = [
  { id: '1', code: '4052509707', name: 'Жулканич Крістіна' },
  { id: '2', code: '2767412928', name: 'Торинець Лариса' },
  { id: '3', code: '3973506888', name: 'Тобак Анастасія' },
]

const positions: Position[] = [
  'Ревізор',
  'Викладка / мерчендайзер',
  'Продавець',
]

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

function getCurrentTime() {
  return new Date().toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void
  onClose: () => void
}) {
 
useEffect(() => {
  const scanner = new Html5QrcodeScanner(
    'barcode-reader',
    {
      fps: 10,
      rememberLastUsedCamera: true,
      supportedScanTypes: [],
      videoConstraints: {
        facingMode: { ideal: 'environment' },
      },
      qrbox: {
        width: 260,
        height: 260,
      },
    },
    false,
  )
    scanner.render(
      (decodedText) => {
        onScan(decodedText)
        scanner.clear()
      },
      () => {
        // ошибки сканирования игнорируем, камера просто ищет код
      },
    )

    return () => {
      scanner.clear().catch(() => {
        // если уже очищен — ничего страшного
      })
    }
  }, [onScan])

  return (
    <section className="panel">
      <h2>Сканування штрихкоду</h2>
      <p>Наведіть камеру на бейдж співробітника.</p>

      <div id="barcode-reader" className="barcode-reader" />

      <button className="wide-button secondary" onClick={onClose}>
        Закрити сканер
      </button>
    </section>
  )
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<AttendanceMode>(null)
  const [inputMethod, setInputMethod] = useState<InputMethod>(null)
  const [employeeCode, setEmployeeCode] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [message, setMessage] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState(
  canUseNotifications() ? Notification.permission : 'unsupported',
)

  const openShifts = shifts.filter((shift) => !shift.checkOutTime)

  const resetAttendanceFlow = () => {
    setMode(null)
    setInputMethod(null)
    setEmployeeCode('')
    setSelectedEmployee(null)
    setSelectedPosition(null)
  }

  const findEmployee = (code: string) => {
    const employee = employees.find((item) => item.code === code.trim())

    if (!employee) {
      setMessage('Співробітника не знайдено')
      setSelectedEmployee(null)
      return
    }

    setSelectedEmployee(employee)
    setMessage('')
  }

  const testScan = () => {
    const testCode = employees[0].code
    setEmployeeCode(testCode)
    findEmployee(testCode)
  }

  const confirmCheckIn = () => {
    if (!selectedEmployee || !selectedPosition) return

    const alreadyOpen = shifts.some(
      (shift) =>
        shift.employeeId === selectedEmployee.id && !shift.checkOutTime,
    )

    if (alreadyOpen) {
      setMessage('У співробітника вже відкрита зміна')
      return
    }

    const newShift: Shift = {
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      position: selectedPosition,
      checkInTime: getCurrentTime(),
    }

    setShifts([newShift, ...shifts])
    setMessage(`Зміну розпочато: ${selectedEmployee.name}`)
    resetAttendanceFlow()
  }

  const confirmCheckOut = () => {
    if (!selectedEmployee) return

    const openShift = shifts.find(
      (shift) =>
        shift.employeeId === selectedEmployee.id && !shift.checkOutTime,
    )

    if (!openShift) {
      setMessage('Відкрита зміна не знайдена')
      return
    }

    setShifts(
      shifts.map((shift) =>
        shift === openShift
          ? { ...shift, checkOutTime: getCurrentTime() }
          : shift,
      ),
    )

    setMessage(`Зміну завершено: ${selectedEmployee.name}`)
    resetAttendanceFlow()
  }

  if (screen === 'attendance') {
    return (
      <main className="app-shell">
        <button className="back-button" onClick={() => setScreen('home')}>
          ← Назад
        </button>

        <section className="app-header vertical">
          <p className="app-kicker">Табель</p>
          <h1>Приход / уход</h1>
          <p className="app-subtitle">
            Магазин уже авторизован. Сотрудник отмечает только себя.
          </p>
        </section>

        {message && <div className="message-box">{message}</div>}

        {!mode && (
          <section className="action-grid">
            <button className="big-action success" onClick={() => setMode('checkin')}>
              Приход
            </button>
            <button className="big-action danger" onClick={() => setMode('checkout')}>
              Уход
            </button>
          </section>
        )}

        {mode && !inputMethod && (
          <section className="panel">
            <h2>{mode === 'checkin' ? 'Приход' : 'Уход'}</h2>
            <p>Выберите способ идентификации сотрудника.</p>

            <button className="wide-button" onClick={() => setInputMethod('scan')}>
              Сканировать штрихкод
            </button>

            <button className="wide-button secondary" onClick={() => setInputMethod('manual')}>
              Ввести код вручную
            </button>
          </section>
        )}

        {mode && inputMethod && (
          <section className="panel">
            <h2>Идентификация сотрудника</h2>

            {inputMethod === 'scan' && !scannerOpen && (
  <>
    <button className="wide-button" onClick={() => setScannerOpen(true)}>
      Открыть камеру
    </button>

    <button className="wide-button secondary" onClick={testScan}>
      Тестовый скан
    </button>
  </>
)}

{inputMethod === 'scan' && scannerOpen && (
  <BarcodeScanner
    onScan={(code) => {
      setEmployeeCode(code)
      findEmployee(code)
      setScannerOpen(false)
    }}
    onClose={() => setScannerOpen(false)}
  />
)}

            <input
              value={employeeCode}
              onChange={(event) => setEmployeeCode(event.target.value)}
              placeholder="Ідентифікаційний код"
              inputMode="numeric"
            />

            <button className="wide-button" onClick={() => findEmployee(employeeCode)}>
              Найти сотрудника
            </button>

            {selectedEmployee && (
              <div className="employee-card">
                <span>Сотрудник найден</span>
                <strong>{selectedEmployee.name}</strong>
                <small>Код: {selectedEmployee.code}</small>
              </div>
            )}
          </section>
        )}

        {mode === 'checkin' && selectedEmployee && (
          <section className="panel">
            <h2>Выберите должность</h2>

            <div className="position-list">
              {positions.map((position) => (
                <button
                  key={position}
                  className={
                    selectedPosition === position
                      ? 'position-button selected'
                      : 'position-button'
                  }
                  onClick={() => setSelectedPosition(position)}
                >
                  {position}
                </button>
              ))}
            </div>

            <button
              className="confirm-button"
              disabled={!selectedPosition}
              onClick={confirmCheckIn}
            >
              Подтвердить приход
            </button>
          </section>
        )}

        {mode === 'checkout' && selectedEmployee && (
          <section className="panel">
            <h2>Подтверждение ухода</h2>
            <p>Закрыть смену сотрудника?</p>

            <button className="confirm-button" onClick={confirmCheckOut}>
              Подтвердить уход
            </button>
          </section>
        )}

        <section className="panel">
          <h2>Сегодня на смене</h2>

          {openShifts.length === 0 ? (
            <p>Открытых смен нет</p>
          ) : (
            <div className="shift-list">
              {openShifts.map((shift) => (
                <div className="shift-row" key={shift.employeeId}>
                  <strong>{shift.employeeName}</strong>
                  <span>{shift.position}</span>
                  <small>Приход: {shift.checkInTime}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    )
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
          <strong>М37</strong>
        </div>
      </section>

      <section className="status-card">
        <div>
          <p>Сегодня</p>
          <strong>{openShifts.length} на смене</strong>
        </div>
        <button type="button">Устройство активно</button>
      </section>
      
      <section className="panel">
  <h2>Приложение</h2>

  <div className="pwa-status">
    <span>Режим</span>
    <strong>
      {isStandaloneMode() ? 'Установлено как приложение' : 'Открыто в браузере'}
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
      setNotificationStatus(result)
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
                setScreen('attendance')
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

export default App