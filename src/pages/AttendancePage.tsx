import { useEffect, useState } from 'react'
import {
  API_BASE_URL,
  ApiError,
  checkIn,
  checkOut,
  getEmployeeByBarcode,
} from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import type { Translation } from '../i18n/translations'
import {
  isValidEmployeeBarcode,
  normalizeEmployeeBarcode,
} from '../lib/barcode'
import { employees, positions } from '../mock/employees'
import type {
  AttendanceMode,
  AttendancePageState,
  DeviceState,
  Employee,
  InputMethod,
  OfflineAttendanceEvent,
  Position,
  Shift,
  SyncState,
} from '../types/attendance'

type AttendancePageProps = {
  initialState: AttendancePageState
  openShifts: Shift[]
  shifts: Shift[]
  setShifts: (shifts: Shift[]) => void
  device: DeviceState
  t: Translation
  onQueueEvent: (event: OfflineAttendanceEvent) => void
  onSyncStateChange: (sync: SyncState) => void
  onStateChange: (state: AttendancePageState) => void
  onBack: () => void
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function createEventId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `attendance-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function mapApiEmployee(employee: {
  id?: unknown
  barcode?: unknown
  full_name?: unknown
  position?: unknown
}): Employee {
  if (
    typeof employee.id !== 'number' ||
    typeof employee.barcode !== 'string' ||
    typeof employee.full_name !== 'string'
  ) {
    throw new Error('Malformed employee response')
  }

  const position = positions.includes(employee.position as Position)
    ? (employee.position as Position)
    : undefined

  return {
    id: String(employee.id),
    backendId: employee.id,
    code: employee.barcode.trim(),
    name: employee.full_name,
    position,
  }
}

function shouldQueueError(error: unknown) {
  return !(error instanceof ApiError) || error.status >= 500
}

function AttendancePage({
  initialState,
  openShifts,
  shifts,
  setShifts,
  device,
  t,
  onQueueEvent,
  onSyncStateChange,
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

  const findEmployee = async (code: string) => {
    const trimmedCode = normalizeEmployeeBarcode(code)
    let fallbackNotFoundMessage = t.attendance.messages.employeeNotFound

    if (!isValidEmployeeBarcode(trimmedCode)) {
      console.debug('Employee lookup rejected: empty barcode', {
        scannedBarcode: code,
        normalizedBarcode: trimmedCode,
      })
      setMessage(t.attendance.messages.invalidBarcode)
      setSelectedEmployee(null)
      return
    }

    if (!device.deviceToken) {
      console.error('Employee lookup skipped: missing device token', {
        scannedBarcode: trimmedCode,
        endpoint: `${API_BASE_URL}/api/employees/by-barcode/${trimmedCode}`,
      })
      setMessage(t.attendance.messages.deviceRequired)
      setSelectedEmployee(null)
      return
    }

    if (device.deviceToken && navigator.onLine) {
      try {
        console.debug('Employee lookup start', {
          scannedBarcode: trimmedCode,
          endpoint: `${API_BASE_URL}/api/employees/by-barcode/${trimmedCode}`,
        })
        const employee = await getEmployeeByBarcode(trimmedCode, device.deviceToken)
        const mappedEmployee = mapApiEmployee(employee)
        setSelectedEmployee(mappedEmployee)
        setSelectedPosition(mappedEmployee.position ?? null)
        setMessage('')
        return
      } catch (error) {
        console.error('Employee lookup failed', {
          scannedBarcode: trimmedCode,
          endpoint: `${API_BASE_URL}/api/employees/by-barcode/${trimmedCode}`,
          status: error instanceof ApiError ? error.status : undefined,
          responseBody: error instanceof ApiError ? error.responseBody : undefined,
          error,
        })

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setMessage(t.attendance.messages.authRequired)
          setSelectedEmployee(null)
          return
        }

        if (error instanceof ApiError && error.status === 404) {
          setMessage(t.attendance.messages.employeeNotFound)
          setSelectedEmployee(null)
          return
        }

        if (error instanceof Error && error.message === 'Malformed employee response') {
          setMessage(t.attendance.messages.malformedEmployee)
          setSelectedEmployee(null)
          return
        }

        fallbackNotFoundMessage = t.attendance.messages.networkLookupFailed
      }
    }

    const employee = employees.find((item) => item.code === trimmedCode)

    if (!employee) {
      setMessage(fallbackNotFoundMessage)
      setSelectedEmployee(null)
      return
    }

    setSelectedEmployee(employee)
    setSelectedPosition(null)
    setMessage('')
  }

  const testScan = () => {
    const testCode = employees[0].code
    setEmployeeCode(testCode)
    void findEmployee(testCode)
  }

  const sendOrQueueEvent = async (
    event: OfflineAttendanceEvent,
    sender: () => Promise<unknown>,
  ) => {
    if (!device.deviceToken || !navigator.onLine) {
      onQueueEvent(event)
      onSyncStateChange({
        apiStatus: navigator.onLine ? 'online' : 'offline',
        lastSyncAt: new Date().toISOString(),
        lastSyncMessage: t.attendance.messages.queuedOffline,
      })
      return true
    }

    try {
      await sender()
      onSyncStateChange({
        apiStatus: 'online',
        lastSyncAt: new Date().toISOString(),
        lastSyncMessage: t.attendance.messages.syncedOnline,
      })
      return true
    } catch (error) {
      if (!shouldQueueError(error)) {
        setMessage(error instanceof Error ? error.message : t.attendance.messages.employeeNotFound)
        return false
      }

      onQueueEvent(event)
      onSyncStateChange({
        apiStatus: 'offline',
        lastSyncAt: new Date().toISOString(),
        lastSyncMessage: t.attendance.messages.queuedOffline,
      })
      return true
    }
  }

  const confirmCheckIn = async () => {
    if (!selectedEmployee || !selectedPosition) return

    const alreadyOpen = shifts.some(
      (shift) =>
        shift.employeeId === selectedEmployee.id && !shift.checkOutTime,
    )

    if (alreadyOpen) {
      setMessage(t.attendance.messages.alreadyOpenShift)
      return
    }

    const eventTime = new Date().toISOString()
    const event: OfflineAttendanceEvent = {
      id: createEventId(),
      type: 'checkin',
      employeeId: selectedEmployee.id,
      employeeBackendId: selectedEmployee.backendId,
      employeeCode: selectedEmployee.code,
      employeeName: selectedEmployee.name,
      position: selectedPosition,
      eventTime,
    }

    const accepted = await sendOrQueueEvent(event, () =>
      checkIn(device.deviceToken as string, {
        employee_id: selectedEmployee.backendId,
        barcode: selectedEmployee.backendId ? undefined : selectedEmployee.code,
        event_time: eventTime,
        raw_payload: {
          offline_event_id: event.id,
          position: selectedPosition,
        },
      }),
    )

    if (!accepted) return

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

  const confirmCheckOut = async () => {
    if (!selectedEmployee) return

    const openShift = shifts.find(
      (shift) =>
        shift.employeeId === selectedEmployee.id && !shift.checkOutTime,
    )

    if (!openShift) {
      setMessage(t.attendance.messages.openShiftNotFound)
      return
    }

    const eventTime = new Date().toISOString()
    const event: OfflineAttendanceEvent = {
      id: createEventId(),
      type: 'checkout',
      employeeId: selectedEmployee.id,
      employeeBackendId: selectedEmployee.backendId,
      employeeCode: selectedEmployee.code,
      employeeName: selectedEmployee.name,
      position: openShift.position,
      eventTime,
    }

    const accepted = await sendOrQueueEvent(event, () =>
      checkOut(device.deviceToken as string, {
        employee_id: selectedEmployee.backendId,
        barcode: selectedEmployee.backendId ? undefined : selectedEmployee.code,
        event_time: eventTime,
        raw_payload: {
          offline_event_id: event.id,
          position: openShift.position,
        },
      }),
    )

    if (!accepted) return

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
              onScan={async (code) => {
                const trimmedCode = normalizeEmployeeBarcode(code)
                setEmployeeCode(trimmedCode)
                setScannerOpen(false)
                await findEmployee(trimmedCode)
              }}
              onManualEntry={() => {
                setScannerOpen(false)
                setInputMethod('manual')
              }}
              onClose={() => setScannerOpen(false)}
            />
          )}

          <input
            value={employeeCode}
            onChange={(event) =>
              setEmployeeCode(normalizeEmployeeBarcode(event.target.value))
            }
            placeholder={t.attendance.employeeCodePlaceholder}
            inputMode="numeric"
          />

          <button className="wide-button" onClick={() => void findEmployee(employeeCode)}>
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
            onClick={() => void confirmCheckIn()}
          >
            {t.attendance.confirmCheckIn}
          </button>
        </section>
      )}

      {mode === 'checkout' && selectedEmployee && (
        <section className="panel">
          <h2>{t.attendance.confirmCheckOutTitle}</h2>
          <p>{t.attendance.confirmCheckOutPrompt}</p>

          <button className="confirm-button" onClick={() => void confirmCheckOut()}>
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
