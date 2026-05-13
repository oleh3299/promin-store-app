import { useEffect, useState } from 'react'
import BarcodeScanner from '../components/BarcodeScanner'
import type { Translation } from '../i18n/translations'
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
  t: Translation
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
  t,
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

  const cancelAttendanceFlow = () => {
    setScannerOpen(false)
    setMessage('')
    resetAttendanceFlow()
  }

  const findEmployee = (code: string) => {
    const employee = employees.find((item) => item.code === code.trim())

    if (!employee) {
      setMessage(t.attendance.messages.employeeNotFound)
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
      setMessage(t.attendance.messages.alreadyOpenShift)
      return
    }

    const newShift: Shift = {
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      position: selectedPosition,
      checkInTime: getCurrentTime(),
    }

    setShifts([newShift, ...shifts])
    setMessage(t.attendance.messages.shiftStarted(selectedEmployee.name))
    resetAttendanceFlow()
  }

  const confirmCheckOut = () => {
    if (!selectedEmployee) return

    const openShift = shifts.find(
      (shift) =>
        shift.employeeId === selectedEmployee.id && !shift.checkOutTime,
    )

    if (!openShift) {
      setMessage(t.attendance.messages.openShiftNotFound)
      return
    }

    setShifts(
      shifts.map((shift) =>
        shift === openShift
          ? { ...shift, checkOutTime: getCurrentTime() }
          : shift,
      ),
    )

    setMessage(t.attendance.messages.shiftFinished(selectedEmployee.name))
    resetAttendanceFlow()
  }

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.attendance.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.attendance.kicker}</p>
        <h1>{t.attendance.title}</h1>
        <p className="app-subtitle">{t.attendance.subtitle}</p>
      </section>

      {message && <div className="message-box">{message}</div>}

      {!mode && (
        <section className="action-grid">
          <button className="big-action success" onClick={() => setMode('checkin')}>
            {t.attendance.checkIn}
          </button>
          <button className="big-action danger" onClick={() => setMode('checkout')}>
            {t.attendance.checkOut}
          </button>
        </section>
      )}

      {mode && !inputMethod && (
        <section className="panel">
          <h2>
            {mode === 'checkin' ? t.attendance.checkIn : t.attendance.checkOut}
          </h2>
          <p>{t.attendance.chooseMethod}</p>

          <button className="wide-button" onClick={() => setInputMethod('scan')}>
            {t.attendance.scanBarcode}
          </button>

          <button className="wide-button secondary" onClick={() => setInputMethod('manual')}>
            {t.attendance.enterCodeManually}
          </button>

          <button className="wide-button secondary" onClick={cancelAttendanceFlow}>
            {t.attendance.cancel}
          </button>
        </section>
      )}

      {mode && inputMethod && (
        <section className="panel">
          <h2>{t.attendance.identifyEmployee}</h2>

          {inputMethod === 'scan' && !scannerOpen && (
            <>
              <button className="wide-button" onClick={() => setScannerOpen(true)}>
                {t.attendance.openCamera}
              </button>

              <button className="wide-button secondary" onClick={testScan}>
                {t.attendance.testScan}
              </button>
            </>
          )}

          {inputMethod === 'scan' && scannerOpen && (
            <BarcodeScanner
              t={t.scanner}
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
            placeholder={t.attendance.employeeCodePlaceholder}
            inputMode="numeric"
          />

          <button className="wide-button" onClick={() => findEmployee(employeeCode)}>
            {t.attendance.findEmployee}
          </button>

          <button className="wide-button secondary" onClick={cancelAttendanceFlow}>
            {t.attendance.cancel}
          </button>

          {selectedEmployee && (
            <div className="employee-card">
              <span>{t.attendance.employeeFound}</span>
              <strong>{selectedEmployee.name}</strong>
              <small>
                {t.attendance.codeLabel}: {selectedEmployee.code}
              </small>
            </div>
          )}
        </section>
      )}

      {mode === 'checkin' && selectedEmployee && (
        <section className="panel">
          <h2>{t.attendance.choosePosition}</h2>

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
                {t.positions[position]}
              </button>
            ))}
          </div>

          <button
            className="confirm-button"
            disabled={!selectedPosition}
            onClick={confirmCheckIn}
          >
            {t.attendance.confirmCheckIn}
          </button>
        </section>
      )}

      {mode === 'checkout' && selectedEmployee && (
        <section className="panel">
          <h2>{t.attendance.confirmCheckOutTitle}</h2>
          <p>{t.attendance.confirmCheckOutPrompt}</p>

          <button className="confirm-button" onClick={confirmCheckOut}>
            {t.attendance.confirmCheckOut}
          </button>
        </section>
      )}

      <section className="panel">
        <h2>{t.attendance.todayOnShift}</h2>

        {openShifts.length === 0 ? (
          <p>{t.attendance.noOpenShifts}</p>
        ) : (
          <div className="shift-list">
            {openShifts.map((shift) => (
              <div className="shift-row" key={shift.employeeId}>
                <strong>{shift.employeeName}</strong>
                <span>{t.positions[shift.position]}</span>
                <small>
                  {t.attendance.checkInLabel}: {shift.checkInTime}
                </small>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default AttendancePage
