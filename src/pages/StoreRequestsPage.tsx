import { useEffect, useMemo, useState } from 'react'
import BackButton from '../components/BackButton'
import {
  ApiError,
  createStoreRequest,
  getStoreRequestActiveEmployees,
  uploadStoreRequest,
} from '../api/client'
import type {
  ActiveStoreEmployee,
  StoreRequestRouteKey,
} from '../api/types'
import type { Translation } from '../i18n/translations'
import type { DeviceState, StoreRequestEntry } from '../types/attendance'

type StoreRequestsPageProps = {
  device: DeviceState
  entry: StoreRequestEntry
  t: Translation
  onBack: () => void
}

const routeOptions: Array<{ key: StoreRequestRouteKey; label: string; description: string; requestType: string }> = [
  {
    key: 'it',
    label: 'Проблема з касою',
    description: 'Каса, чек, оплата, зміна',
    requestType: 'cash_register',
  },
  {
    key: 'it',
    label: 'Проблема з принтером',
    description: 'Принтер чеків, етикеток або друк',
    requestType: 'printer',
  },
  {
    key: 'accounting',
    label: 'Питання по накладній',
    description: 'Документ, постачальник, сума, товар',
    requestType: 'invoice_question',
  },
  {
    key: 'manager',
    label: 'Потрібна допомога адміністрації',
    description: 'Організаційне питання',
    requestType: 'manager',
  },
  {
    key: 'manager',
    label: 'Інше питання',
    description: 'Якщо не підходить жоден варіант',
    requestType: 'other',
  },
]

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxStoreRequestFileSize = 10 * 1024 * 1024
const REQUEST_SENT_MESSAGE = 'Звернення надіслано.\nОфіс отримав повідомлення.'
const REQUEST_ERROR_MESSAGE = 'Не вдалося надіслати.\nПеревірте інтернет і спробуйте ще раз.'
const SERVER_UNAVAILABLE_MESSAGE = REQUEST_ERROR_MESSAGE
const HELP_MESSAGE_PLACEHOLDER = 'Наприклад: не друкує чек, не відкривається зміна, помилка в накладній'

function getInitialRouteKey(entry: StoreRequestEntry): StoreRequestRouteKey {
  return entry === 'urgentTechnical' ? 'it' : 'accounting'
}

function getInitialRequestType(entry: StoreRequestEntry, routeKey: StoreRequestRouteKey): string | null {
  if (entry === 'urgentTechnical') return 'urgent_it'
  if (routeKey === 'it') return 'it_problem'
  if (routeKey === 'accounting') return 'accounting'
  if (routeKey === 'manager') return 'manager'
  return null
}

function StoreRequestsPage({ device, entry, t, onBack }: StoreRequestsPageProps) {
  const [routeKey, setRouteKey] = useState<StoreRequestRouteKey>(getInitialRouteKey(entry))
  const [requestType, setRequestType] = useState<string | null>(
    getInitialRequestType(entry, getInitialRouteKey(entry)),
  )
  const [message, setMessage] = useState('')
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const isUrgentTechnical = entry === 'urgentTechnical'
  const messagePlaceholder = HELP_MESSAGE_PLACEHOLDER

  useEffect(() => {
    const nextRouteKey = getInitialRouteKey(entry)
    setRouteKey(nextRouteKey)
    setRequestType(getInitialRequestType(entry, nextRouteKey))
    setMessage('')
    setStatusMessage('')
  }, [entry])

  useEffect(() => {
    let cancelled = false

    async function loadEmployees() {
      if (!device.deviceToken) {
        setIsLoadingEmployees(false)
        return
      }

      try {
        const response = await getStoreRequestActiveEmployees(device.deviceToken)
        if (cancelled) return

        setEmployees(response.items)
        setSelectedEmployeeId(response.items.length === 1 ? response.items[0].employee_id : null)
      } catch (error) {
        console.error('Store request employee load failed', { error })
        if (!cancelled) {
          setEmployees([])
          setSelectedEmployeeId(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEmployees(false)
        }
      }
    }

    void loadEmployees()

    return () => {
      cancelled = true
    }
  }, [device.deviceToken])

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employee_id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )
  const employeeRequired = employees.length > 1 && selectedEmployeeId === null
  const canSubmit = Boolean(message.trim()) && !employeeRequired && !isSubmitting && !isLoadingEmployees

  const handleFileChange = (nextFile: File | undefined) => {
    setStatusMessage('')
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!allowedImageTypes.includes(nextFile.type)) {
      setFile(null)
      setStatusMessage('Підтримуються тільки JPEG, PNG або WEBP')
      return
    }
    if (nextFile.size > maxStoreRequestFileSize) {
      setFile(null)
      setStatusMessage('Файл занадто великий. Максимум 10 MB')
      return
    }
    setFile(nextFile)
  }

  const submitRequest = async () => {
    if (!device.deviceToken || !canSubmit) return
    if (!navigator.onLine) {
      setStatusMessage(SERVER_UNAVAILABLE_MESSAGE)
      return
    }

    setIsSubmitting(true)
    setStatusMessage('')
    try {
      const response = file
        ? await uploadStoreRequest(
            device.deviceToken,
            (() => {
              const formData = new FormData()
              formData.append('route_key', routeKey)
              if (requestType) formData.append('request_type', requestType)
              if (selectedEmployeeId !== null) formData.append('employee_id', String(selectedEmployeeId))
              formData.append('message', message.trim())
              formData.append('file', file)
              return formData
            })(),
          )
        : await createStoreRequest(device.deviceToken, {
            route_key: routeKey,
            request_type: requestType,
            employee_id: selectedEmployeeId,
            message: message.trim(),
          })

      if (response.ok) {
        setMessage('')
        setFile(null)
        setStatusMessage(REQUEST_SENT_MESSAGE)
        return
      }

      if (response.error === 'route_not_configured') {
        setStatusMessage(t.storeRequests.routeNotConfigured)
        return
      }

      if (response.error === 'employee_required') {
        setStatusMessage(t.storeRequests.employeeRequired)
        return
      }

      setStatusMessage(response.message ?? REQUEST_ERROR_MESSAGE)
    } catch (error) {
      console.error('Store request submit failed', { error })
      setStatusMessage(error instanceof ApiError ? REQUEST_ERROR_MESSAGE : SERVER_UNAVAILABLE_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <BackButton label={t.storeRequests.back} onBack={onBack} />

      <section className="app-header vertical">
        <p className="app-kicker">Звернення</p>
        <h1>Допомога</h1>
        <p className="app-subtitle">Оберіть, з чим потрібна допомога</p>
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      <section className="panel store-request-form">
        {isUrgentTechnical ? (
          <div className="route-summary">
            <span>{t.storeRequests.requestType}</span>
            <strong>Проблема з касою або технікою</strong>
          </div>
        ) : (
          <div className="request-route-grid">
            {routeOptions.map((option) => (
              <button
                key={option.requestType}
                className={requestType === option.requestType ? 'route-button selected' : 'route-button'}
                type="button"
                onClick={() => {
                  setRouteKey(option.key)
                  setRequestType(option.requestType)
                  setStatusMessage('')
                }}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        )}

        <div className="employee-card">
          <span>{t.storeRequests.employeeLabel}</span>
          {employees.length === 0 && <strong>{t.storeRequests.employeeUnknown}</strong>}
          {employees.length === 1 && <strong>{employees[0].full_name}</strong>}
          {employees.length > 1 && (
            <select
              value={selectedEmployeeId ?? ''}
              onChange={(event) =>
                setSelectedEmployeeId(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">{t.storeRequests.employeeSelect}</option>
              {employees.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          )}
          {selectedEmployee && <small>{selectedEmployee.position}</small>}
        </div>

        <label>
          <span>Опишіть коротко, що сталося</span>
          <textarea
            value={message}
            placeholder={messagePlaceholder}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
          />
        </label>

        <label className="file-picker compact">
          <span>Фото (необов'язково)</span>
          <strong>{file ? file.name : 'Додати фото'}</strong>
          <input
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            type="file"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
        </label>

        <button className="confirm-button" disabled={!canSubmit} onClick={() => void submitRequest()}>
          {isSubmitting ? 'Надсилаємо звернення...' : 'Надіслати звернення'}
        </button>
      </section>
    </main>
  )
}

export default StoreRequestsPage
