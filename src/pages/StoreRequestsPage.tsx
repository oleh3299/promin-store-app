import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createStoreRequest,
  getStoreRequestActiveEmployees,
} from '../api/client'
import type {
  ActiveStoreEmployee,
  StoreRequestRouteKey,
} from '../api/types'
import type { Translation } from '../i18n/translations'
import type { DeviceState } from '../types/attendance'

type StoreRequestsPageProps = {
  device: DeviceState
  t: Translation
  onBack: () => void
}

const routeOptions: Array<{ key: StoreRequestRouteKey; label: keyof Translation['storeRequests'] }> = [
  { key: 'purchase', label: 'purchase' },
  { key: 'accounting', label: 'accounting' },
  { key: 'it', label: 'it' },
]

const accountingTypes = ['receipt', 'return', 'writeoff', 'completion', 'other'] as const

function StoreRequestsPage({ device, t, onBack }: StoreRequestsPageProps) {
  const [routeKey, setRouteKey] = useState<StoreRequestRouteKey>('purchase')
  const [requestType, setRequestType] = useState<string>('receipt')
  const [message, setMessage] = useState('')
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

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
      } catch {
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

  const submitRequest = async () => {
    if (!device.deviceToken || !canSubmit) return

    setIsSubmitting(true)
    setStatusMessage('')
    try {
      const response = await createStoreRequest(device.deviceToken, {
        route_key: routeKey,
        request_type: routeKey === 'accounting' ? requestType : null,
        employee_id: selectedEmployeeId,
        message: message.trim(),
      })

      if (response.ok) {
        setMessage('')
        setStatusMessage(t.storeRequests.sent)
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

      setStatusMessage(response.message ?? t.storeRequests.genericError)
    } catch (error) {
      setStatusMessage(error instanceof ApiError ? error.message : t.storeRequests.genericError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.storeRequests.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.storeRequests.kicker}</p>
        <h1>{t.storeRequests.title}</h1>
        <p className="app-subtitle">{t.storeRequests.subtitle}</p>
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      <section className="panel store-request-form">
        <div className="request-route-grid">
          {routeOptions.map((option) => (
            <button
              key={option.key}
              className={routeKey === option.key ? 'route-button selected' : 'route-button'}
              type="button"
              onClick={() => setRouteKey(option.key)}
            >
              {String(t.storeRequests[option.label])}
            </button>
          ))}
        </div>

        {routeKey === 'accounting' && (
          <label>
            <span>{t.storeRequests.requestType}</span>
            <select value={requestType} onChange={(event) => setRequestType(event.target.value)}>
              {accountingTypes.map((type) => (
                <option key={type} value={type}>
                  {t.storeRequests.accountingTypes[type]}
                </option>
              ))}
            </select>
          </label>
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
          <span>{t.storeRequests.messageLabel}</span>
          <textarea
            value={message}
            placeholder={t.storeRequests.messagePlaceholder}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
          />
        </label>

        <button className="confirm-button" disabled={!canSubmit} onClick={() => void submitRequest()}>
          {isSubmitting ? t.storeRequests.sending : t.storeRequests.send}
        </button>
      </section>
    </main>
  )
}

export default StoreRequestsPage
