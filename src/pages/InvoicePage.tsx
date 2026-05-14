import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getTodayInvoices,
  getStoreRequestActiveEmployees,
  uploadInvoice,
} from '../api/client'
import type { ActiveStoreEmployee, InvoiceRequestType, InvoiceTodayItem } from '../api/types'
import type { Translation } from '../i18n/translations'
import type { DeviceState } from '../types/attendance'

type InvoicePageProps = {
  device: DeviceState
  t: Translation
  onBack: () => void
}

const invoiceTypes: InvoiceRequestType[] = ['incoming', 'return', 'writeoff', 'assembly']
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxInvoiceFileSize = 10 * 1024 * 1024
const invoiceTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Uzhgorod',
})

function InvoicePage({ device, t, onBack }: InvoicePageProps) {
  const [requestType, setRequestType] = useState<InvoiceRequestType>('incoming')
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [todayItems, setTodayItems] = useState<InvoiceTodayItem[]>([])
  const [isLoadingToday, setIsLoadingToday] = useState(true)

  const loadTodayInvoices = useCallback(async () => {
    if (!device.deviceToken) {
      setTodayItems([])
      setIsLoadingToday(false)
      return
    }

    setIsLoadingToday(true)
    try {
      const response = await getTodayInvoices(device.deviceToken)
      setTodayItems(response.items)
    } catch {
      setTodayItems([])
    } finally {
      setIsLoadingToday(false)
    }
  }, [device.deviceToken])

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

  useEffect(() => {
    void loadTodayInvoices()
  }, [loadTodayInvoices])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employee_id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )
  const employeeRequired = employees.length > 1 && selectedEmployeeId === null
  const canSubmit = Boolean(file) && !employeeRequired && !isLoadingEmployees && !isSubmitting

  const handleFileChange = (nextFile: File | undefined) => {
    setStatusMessage('')
    if (!nextFile) {
      setFile(null)
      return
    }

    if (!allowedImageTypes.includes(nextFile.type)) {
      setFile(null)
      setStatusMessage(t.invoice.invalidFileType)
      return
    }

    if (nextFile.size > maxInvoiceFileSize) {
      setFile(null)
      setStatusMessage(t.invoice.fileTooLarge)
      return
    }

    setFile(nextFile)
  }

  const submitInvoice = async () => {
    if (!device.deviceToken || isSubmitting) return
    if (!file) {
      setStatusMessage(t.invoice.fileRequired)
      return
    }
    if (employeeRequired) {
      setStatusMessage(t.invoice.employeeRequired)
      return
    }

    const formData = new FormData()
    formData.append('request_type', requestType)
    if (selectedEmployeeId !== null) {
      formData.append('employee_id', String(selectedEmployeeId))
    }
    if (comment.trim()) {
      formData.append('comment', comment.trim())
    }
    formData.append('file', file)

    setIsSubmitting(true)
    setStatusMessage('')
    try {
      const response = await uploadInvoice(device.deviceToken, formData)
      if (response.ok) {
        setFile(null)
        setComment('')
        setStatusMessage(t.invoice.sent)
        await loadTodayInvoices()
        return
      }

      if (response.error === 'route_not_configured') {
        setStatusMessage(t.invoice.routeNotConfigured)
        return
      }
      if (response.error === 'employee_required') {
        setStatusMessage(t.invoice.employeeRequired)
        return
      }
      if (response.error === 'invalid_file_type') {
        setStatusMessage(t.invoice.invalidFileType)
        return
      }
      if (response.error === 'file_too_large') {
        setStatusMessage(t.invoice.fileTooLarge)
        return
      }

      setStatusMessage(response.message ?? t.invoice.genericError)
    } catch {
      setStatusMessage(t.invoice.genericError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.invoice.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.invoice.kicker}</p>
        <h1>{t.invoice.title}</h1>
        <p className="app-subtitle">{t.invoice.subtitle}</p>
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      <section className="panel invoice-form">
        <label>
          <span>{t.invoice.operationType}</span>
          <select value={requestType} onChange={(event) => setRequestType(event.target.value as InvoiceRequestType)}>
            {invoiceTypes.map((type) => (
              <option key={type} value={type}>
                {t.invoice.types[type]}
              </option>
            ))}
          </select>
        </label>

        <div className="employee-card">
          <span>{t.invoice.employeeLabel}</span>
          {employees.length === 0 && <strong>{t.invoice.employeeUnknown}</strong>}
          {employees.length === 1 && <strong>{employees[0].full_name}</strong>}
          {employees.length > 1 && (
            <select
              value={selectedEmployeeId ?? ''}
              onChange={(event) =>
                setSelectedEmployeeId(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">{t.invoice.employeeSelect}</option>
              {employees.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          )}
          {selectedEmployee && <small>{selectedEmployee.position}</small>}
        </div>

        <label className="file-picker">
          <span>{t.invoice.photoLabel}</span>
          <strong>{t.invoice.takePhoto}</strong>
          <input
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            type="file"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
        </label>

        {previewUrl && (
          <div className="invoice-preview">
            <img alt={t.invoice.photoLabel} src={previewUrl} />
          </div>
        )}

        <label>
          <span>{t.invoice.commentLabel}</span>
          <textarea
            value={comment}
            placeholder={t.invoice.commentPlaceholder}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
          />
        </label>

        <button className="confirm-button" disabled={!canSubmit} onClick={() => void submitInvoice()}>
          {isSubmitting ? t.invoice.sending : t.invoice.send}
        </button>
      </section>

      <section className="panel invoice-today">
        <h2>{t.invoice.todayTitle}</h2>
        {!isLoadingToday && todayItems.length === 0 && <p>{t.invoice.todayEmpty}</p>}
        {todayItems.length > 0 && (
          <div className="invoice-today-list">
            {todayItems.map((item) => (
              <div className="invoice-today-row" key={item.id}>
                <span>{invoiceTimeFormatter.format(new Date(item.sent_at ?? item.created_at))}</span>
                <strong>{item.request_type_label || t.invoice.types[item.request_type]}</strong>
                <span>{item.employee_name ?? t.invoice.employeeUnknown}</span>
                <span>{item.status === 'sent' ? t.invoice.statusSent : item.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default InvoicePage
