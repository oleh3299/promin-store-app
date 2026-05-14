import { useEffect, useMemo, useState } from 'react'
import {
  getPhotoReportTemplate,
  getStoreRequestActiveEmployees,
  submitPhotoReport,
} from '../api/client'
import type { ActiveStoreEmployee, PhotoReportTemplateItem } from '../api/types'
import type { Translation } from '../i18n/translations'
import type { DeviceState } from '../types/attendance'

type PhotoReportPageProps = {
  device: DeviceState
  t: Translation
  onBack: () => void
}

type PhotoState = {
  file: File
  previewUrl: string
}

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxPhotoSize = 10 * 1024 * 1024

function PhotoReportPage({ device, t, onBack }: PhotoReportPageProps) {
  const [items, setItems] = useState<PhotoReportTemplateItem[]>([])
  const [photos, setPhotos] = useState<Record<number, PhotoState>>({})
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPageData() {
      if (!device.deviceToken) {
        setIsLoading(false)
        return
      }

      try {
        const [templateResponse, employeesResponse] = await Promise.all([
          getPhotoReportTemplate(device.deviceToken),
          getStoreRequestActiveEmployees(device.deviceToken),
        ])
        if (cancelled) return
        setItems(templateResponse.items)
        setEmployees(employeesResponse.items)
        setSelectedEmployeeId(
          employeesResponse.items.length === 1 ? employeesResponse.items[0].employee_id : null,
        )
      } catch {
        if (!cancelled) {
          setStatusMessage(t.photoReport.genericError)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPageData()

    return () => {
      cancelled = true
    }
  }, [device.deviceToken, t.photoReport.genericError])

  useEffect(
    () => () => {
      Object.values(photos).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    },
    [photos],
  )

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employee_id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )
  const doneCount = items.filter((item) => photos[item.id]).length
  const employeeRequired = employees.length > 1 && selectedEmployeeId === null
  const canSubmit = doneCount === items.length && items.length > 0 && !employeeRequired && !isSubmitting

  const setItemPhoto = (itemId: number, nextFile: File | undefined) => {
    setStatusMessage('')
    if (!nextFile) return

    if (!allowedImageTypes.includes(nextFile.type)) {
      setStatusMessage(t.photoReport.invalidFileType)
      return
    }

    if (nextFile.size > maxPhotoSize) {
      setStatusMessage(t.photoReport.fileTooLarge)
      return
    }

    setPhotos((currentPhotos) => {
      const currentPhoto = currentPhotos[itemId]
      if (currentPhoto) {
        URL.revokeObjectURL(currentPhoto.previewUrl)
      }

      return {
        ...currentPhotos,
        [itemId]: {
          file: nextFile,
          previewUrl: URL.createObjectURL(nextFile),
        },
      }
    })
  }

  const submitReport = async () => {
    if (!device.deviceToken || isSubmitting) return
    if (doneCount !== items.length) {
      setStatusMessage(t.photoReport.incomplete)
      return
    }
    if (employeeRequired) {
      setStatusMessage(t.photoReport.employeeRequired)
      return
    }

    const formData = new FormData()
    formData.append('item_ids', JSON.stringify(items.map((item) => item.id)))
    if (selectedEmployeeId !== null) {
      formData.append('employee_id', String(selectedEmployeeId))
    }
    items.forEach((item) => {
      formData.append('files', photos[item.id].file)
    })

    setIsSubmitting(true)
    setStatusMessage('')
    try {
      const response = await submitPhotoReport(device.deviceToken, formData)
      if (response.ok) {
        setStatusMessage(t.photoReport.sent)
        setPhotos((currentPhotos) => {
          Object.values(currentPhotos).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
          return {}
        })
        return
      }

      if (response.error === 'employee_required') {
        setStatusMessage(t.photoReport.employeeRequired)
        return
      }
      if (response.error === 'incomplete_report') {
        setStatusMessage(t.photoReport.incomplete)
        return
      }
      if (response.error === 'invalid_file_type') {
        setStatusMessage(t.photoReport.invalidFileType)
        return
      }
      if (response.error === 'file_too_large') {
        setStatusMessage(t.photoReport.fileTooLarge)
        return
      }

      setStatusMessage(response.message ?? t.photoReport.genericError)
    } catch {
      setStatusMessage(t.photoReport.genericError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.photoReport.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.photoReport.kicker}</p>
        <h1>{t.photoReport.title}</h1>
        <p className="app-subtitle">{t.photoReport.subtitle}</p>
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      <section className="panel photo-report-status">
        <strong>{t.photoReport.progress(doneCount, items.length)}</strong>
      </section>

      <section className="panel">
        <div className="employee-card">
          <span>{t.photoReport.employeeLabel}</span>
          {employees.length === 0 && <strong>{t.photoReport.employeeUnknown}</strong>}
          {employees.length === 1 && <strong>{employees[0].full_name}</strong>}
          {employees.length > 1 && (
            <select
              value={selectedEmployeeId ?? ''}
              onChange={(event) =>
                setSelectedEmployeeId(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">{t.photoReport.employeeSelect}</option>
              {employees.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          )}
          {selectedEmployee && <small>{selectedEmployee.position}</small>}
        </div>
      </section>

      <section className="photo-report-list">
        {items.map((item) => {
          const photo = photos[item.id]
          return (
            <div className="panel photo-report-item" key={item.id}>
              <h2>{item.title}</h2>
              {photo && (
                <div className="invoice-preview">
                  <img alt={item.title} src={photo.previewUrl} />
                </div>
              )}
              <label className="file-picker">
                <span>{item.title}</span>
                <strong>{photo ? t.photoReport.changePhoto : t.photoReport.takePhoto}</strong>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  type="file"
                  onChange={(event) => setItemPhoto(item.id, event.target.files?.[0])}
                />
              </label>
            </div>
          )
        })}
      </section>

      <button className="confirm-button" disabled={!canSubmit || isLoading} onClick={() => void submitReport()}>
        {isSubmitting ? t.photoReport.sending : t.photoReport.send}
      </button>
    </main>
  )
}

export default PhotoReportPage
