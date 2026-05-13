import { useEffect, useState } from 'react'
import BarcodeScanner from '../components/BarcodeScanner'
import { employees, positions } from '../mock/employees'
import type {
  AttendanceMode,
  AttendancePageState,
  Employee,
  InputMethod,
  Position,
  Shift,
} from '../types/attendance'

type AttendancePageProps = {
  initialState: AttendancePageState
  openShifts: Shift[]
  shifts: Shift[]
  setShifts: (shifts: Shift[]) => void
  onStateChange: (state: AttendancePageState) => void
  onBack: () => void
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AttendancePage({
  initialState,
  openShifts,
  shifts,
  setShifts,
  onStateChange,
  onBack,
}: AttendancePageProps) {
  const [mode, setMode] = useState<AttendanceMode>(initialState.mode)
  const [inputMethod, setInputMethod] = useState<InputMethod>(
    initialState.inputMethod,
  )
  const [employeeCode, setEmployeeCode] = useState(initialState.employeeCode)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    () =>
      employees.find((employee) => employee.id === initialState.selectedEmployeeId) ??
      null,
  )
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    initialState.selectedPosition,
  )
  const [message, setMessage] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    onStateChange({
      mode,
      inputMethod,
      employeeCode,
      selectedEmployeeId: selectedEmployee?.id ?? null,
      selectedPosition,
    })
  }, [
    employeeCode,
    inputMethod,
    mode,
    onStateChange,
    selectedEmployee,
    selectedPosition,
  ])

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

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
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

export default AttendancePage
