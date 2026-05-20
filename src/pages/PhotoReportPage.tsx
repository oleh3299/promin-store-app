import { useEffect, useMemo, useRef, useState } from 'react'
import { getPhotoReportTemplate, getStoreRequestActiveEmployees, submitPhotoReportItem } from '../api/client'
import type { ActiveStoreEmployee, PhotoReportTemplateItem } from '../api/types'
import type { Translation } from '../i18n/translations'
import type { DeviceState } from '../types/attendance'
import BackButton from '../components/BackButton'

type PhotoReportPageProps = {
  device: DeviceState
  t: Translation
  onBack: () => void
  onCompleted?: (message: string) => void
}

type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed'

type PhotoState = {
  file: File
  previewUrl: string
  status: UploadStatus
}

type StoredPhotoRecord = {
  key: string
  itemId: number
  file: File
  status: UploadStatus
}

type StoredPhotoMeta = {
  key: string
  reportId: number | null
  employeeId: number | null
}

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxPhotoSize = 10 * 1024 * 1024
const dbName = 'promin-photo-report'
const photoStoreName = 'photos'
const metaStoreName = 'meta'

function openPhotoReportDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(photoStoreName)) {
        db.createObjectStore(photoStoreName, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(metaStoreName)) {
        db.createObjectStore(metaStoreName, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openPhotoReportDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const request = runner(tx.objectStore(storeName))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}

function draftPrefix(device: DeviceState) {
  return `device-${device.id ?? (device.deviceUuid || 'unknown')}`
}

function photoKey(device: DeviceState, itemId: number) {
  return `${draftPrefix(device)}:item-${itemId}`
}

function metaKey(device: DeviceState) {
  return `${draftPrefix(device)}:meta`
}

async function saveStoredPhoto(device: DeviceState, itemId: number, file: File, status: UploadStatus) {
  await runStore(photoStoreName, 'readwrite', (store) =>
    store.put({ key: photoKey(device, itemId), itemId, file, status }),
  )
}

async function saveStoredPhotoStatus(device: DeviceState, itemId: number, status: UploadStatus) {
  const existing = await runStore<StoredPhotoRecord | undefined>(photoStoreName, 'readonly', (store) =>
    store.get(photoKey(device, itemId)),
  )
  if (!existing) return
  await runStore(photoStoreName, 'readwrite', (store) => store.put({ ...existing, status }))
}

async function loadStoredPhotos(device: DeviceState) {
  const records = await runStore<StoredPhotoRecord[]>(photoStoreName, 'readonly', (store) => store.getAll())
  const prefix = `${draftPrefix(device)}:item-`
  return records.filter((record) => record.key.startsWith(prefix))
}

async function saveStoredMeta(device: DeviceState, reportId: number | null, employeeId: number | null) {
  await runStore(metaStoreName, 'readwrite', (store) =>
    store.put({ key: metaKey(device), reportId, employeeId }),
  )
}

async function loadStoredMeta(device: DeviceState) {
  return runStore<StoredPhotoMeta | undefined>(metaStoreName, 'readonly', (store) => store.get(metaKey(device)))
}

async function clearStoredDraft(device: DeviceState) {
  const records = await loadStoredPhotos(device)
  await Promise.all(records.map((record) => runStore(photoStoreName, 'readwrite', (store) => store.delete(record.key))))
  await runStore(metaStoreName, 'readwrite', (store) => store.delete(metaKey(device)))
}

function PhotoReportPage({ device, t, onBack, onCompleted }: PhotoReportPageProps) {
  const [items, setItems] = useState<PhotoReportTemplateItem[]>([])
  const [photos, setPhotos] = useState<Record<number, PhotoState>>({})
  const [reportId, setReportId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [finalSuccess, setFinalSuccess] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const statusBlockRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPageData() {
      if (!device.deviceToken) {
        setIsLoading(false)
        return
      }

      try {
        const [templateResponse, employeesResponse, storedPhotos, storedMeta] = await Promise.all([
          getPhotoReportTemplate(device.deviceToken),
          getStoreRequestActiveEmployees(device.deviceToken),
          loadStoredPhotos(device),
          loadStoredMeta(device),
        ])
        if (cancelled) return

        setItems(templateResponse.items)
        setEmployees(employeesResponse.items)
        setSelectedEmployeeId(
          storedMeta?.employeeId ??
            (employeesResponse.items.length === 1 ? employeesResponse.items[0].employee_id : null),
        )
        setReportId(storedMeta?.reportId ?? null)
        if (storedPhotos.length > 0) {
          const restoredPhotos = Object.fromEntries(
            storedPhotos.map((record) => [
              record.itemId,
              {
                file: record.file,
                previewUrl: URL.createObjectURL(record.file),
                status: record.status === 'uploading' ? 'failed' : record.status,
              },
            ]),
          )
          setPhotos(restoredPhotos)
          setStatusMessage('Є незавершений фотозвіт. Фото не втрачено.')
        }
      } catch (error) {
        console.error('photoReportLoadFailed', { error })
        if (!cancelled) {
          setStatusMessage('Не вдалося завантажити фотозвіт. Перевірте зв’язок із сервером.')
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
  }, [device, t.photoReport.genericError])

  useEffect(
    () => () => {
      Object.values(photos).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    },
    [photos],
  )

  useEffect(() => {
    void saveStoredMeta(device, reportId, selectedEmployeeId)
  }, [device, reportId, selectedEmployeeId])

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employee_id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )
  const requiredItems = useMemo(() => items.filter((item) => item.is_required), [items])
  const doneCount = requiredItems.filter((item) => photos[item.id]).length
  const uploadedCount = requiredItems.filter((item) => photos[item.id]?.status === 'uploaded').length
  const remainingCount = Math.max(requiredItems.length - uploadedCount, 0)
  const pendingSelectedCount = Object.values(photos).filter((photo) => photo.status !== 'uploaded').length
  const employeeRequired = employees.length > 1 && selectedEmployeeId === null
  const hasMissingRequiredPhotos = requiredItems.some((item) => !photos[item.id])
  // TODO/FIXME: TEMPORARY TEST MODE: allow partial photo report submit.
  // Keep required item calculation visible, but do not block upload while channel testing is in progress.
  const partialPhotoReportTestMode = true
  const canSubmit = pendingSelectedCount > 0 && !employeeRequired && !isSubmitting

  const scrollToUploadStatus = () => {
    window.requestAnimationFrame(() => {
      statusBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const updatePhotoStatus = async (itemId: number, status: UploadStatus) => {
    setPhotos((currentPhotos) => {
      const currentPhoto = currentPhotos[itemId]
      if (!currentPhoto) return currentPhotos
      return { ...currentPhotos, [itemId]: { ...currentPhoto, status } }
    })
    await saveStoredPhotoStatus(device, itemId, status)
  }

  const setItemPhoto = async (itemId: number, nextFile: File | undefined) => {
    setStatusMessage('')
    setFinalSuccess(false)
    if (!nextFile) return

    if (!allowedImageTypes.includes(nextFile.type)) {
      setStatusMessage(t.photoReport.invalidFileType)
      return
    }

    if (nextFile.size > maxPhotoSize) {
      setStatusMessage(t.photoReport.fileTooLarge)
      return
    }

    await saveStoredPhoto(device, itemId, nextFile, 'pending')
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
          status: 'pending',
        },
      }
    })
  }

  const resetLocalPhotoReport = async () => {
    Object.values(photos).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    await clearStoredDraft(device)
    setPhotos({})
    setReportId(null)
    setStatusMessage('')
    setFinalSuccess(false)
    setShowResetConfirm(false)
  }

  const submitReport = async () => {
    if (!device.deviceToken || isSubmitting) return
    scrollToUploadStatus()
    if (hasMissingRequiredPhotos && !partialPhotoReportTestMode) {
      setStatusMessage(t.photoReport.requiredMissing)
      return
    }
    if (employeeRequired) {
      setStatusMessage(t.photoReport.employeeRequired)
      return
    }
    if (!navigator.onLine) {
      setStatusMessage('Інтернет зник. Фото не втрачено.\nНадіслано: 0 з 0\nЗалишилось: 0')
      scrollToUploadStatus()
      return
    }

    const pendingItems = items.filter((item) => {
      const photo = photos[item.id]
      return photo && photo.status !== 'uploaded'
    })

    if (pendingItems.length === 0) {
      await setFinalStatus()
      return
    }

    const uploadTotal = pendingItems.length
    setIsSubmitting(true)
    setStatusMessage(`Надсилаємо фото...\nНадіслано: 0 з ${uploadTotal}\nЗалишилось: ${uploadTotal}`)
    scrollToUploadStatus()
    let currentReportId = reportId
    let uploadedInThisRun = 0
    let stoppedWithError = false

    try {
      for (let index = 0; index < pendingItems.length; index += 1) {
        if (!navigator.onLine) {
          stoppedWithError = true
          setStatusMessage(
            `Інтернет зник. Фото не втрачено.\nНадіслано: ${uploadedInThisRun} з ${uploadTotal}\nЗалишилось: ${uploadTotal - uploadedInThisRun}`,
          )
          scrollToUploadStatus()
          break
        }

        const item = pendingItems[index]
        const photo = photos[item.id]
        if (!photo || photo.status === 'uploaded') continue

        await updatePhotoStatus(item.id, 'uploading')
        setStatusMessage(
          `Надсилаємо фото...\nНадіслано: ${uploadedInThisRun} з ${uploadTotal}\nЗалишилось: ${uploadTotal - uploadedInThisRun}`,
        )

        const formData = new FormData()
        formData.append('item_id', String(item.id))
        if (currentReportId !== null) {
          formData.append('report_id', String(currentReportId))
        }
        if (selectedEmployeeId !== null) {
          formData.append('employee_id', String(selectedEmployeeId))
        }
        formData.append('file', photo.file)

        const response = await submitPhotoReportItem(device.deviceToken, formData)
        if (!response.ok || response.report_id === null) {
          stoppedWithError = true
          await updatePhotoStatus(item.id, 'failed')
          setStatusMessage(
            `${response.message ?? 'Інтернет зник. Фото не втрачено.'}\nНадіслано: ${uploadedInThisRun} з ${uploadTotal}\nЗалишилось: ${uploadTotal - uploadedInThisRun}`,
          )
          scrollToUploadStatus()
          break
        }

        currentReportId = response.report_id
        setReportId(response.report_id)
        await saveStoredMeta(device, response.report_id, selectedEmployeeId)
        await updatePhotoStatus(item.id, 'uploaded')
        uploadedInThisRun += 1
        setStatusMessage(
          `Надсилаємо фото...\nНадіслано: ${uploadedInThisRun} з ${uploadTotal}\nЗалишилось: ${uploadTotal - uploadedInThisRun}`,
        )
      }

      if (!stoppedWithError && uploadedInThisRun === uploadTotal) {
        Object.values(photos).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
        await clearStoredDraft(device)
        setPhotos({})
        setReportId(null)
        setStatusMessage('Фотозвіт успішно виконаний!')
        onCompleted?.('Фотозвіт успішно виконаний!')
        if (!onCompleted) {
          onBack()
        }
      }
    } catch (error) {
      console.error('photoReportItemSubmitFailed', { error })
      setStatusMessage(
        `Інтернет зник. Фото не втрачено.\nНадіслано: ${uploadedInThisRun} з ${uploadTotal}\nЗалишилось: ${uploadTotal - uploadedInThisRun}`,
      )
      scrollToUploadStatus()
      const uploadingItem = Object.entries(photos).find(([, photo]) => photo.status === 'uploading')
      if (uploadingItem) {
        await updatePhotoStatus(Number(uploadingItem[0]), 'failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const setFinalStatus = async () => {
    setFinalSuccess(true)
    setStatusMessage(
      partialPhotoReportTestMode
        ? `Надіслано: ${uploadedCount} фото. Це тестовий режим. Повний контроль фотозвіту тимчасово вимкнений.`
        : 'Фотозвіт надіслано. Дякуємо. Можна закривати додаток.',
    )
    Object.values(photos).forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    setPhotos({})
    setReportId(null)
    await clearStoredDraft(device)
  }

  useEffect(() => {
    if (
      !partialPhotoReportTestMode &&
      !isSubmitting &&
      requiredItems.length > 0 &&
      uploadedCount === requiredItems.length &&
      Object.keys(photos).length > 0
    ) {
      void setFinalStatus()
    }
  }, [isSubmitting, partialPhotoReportTestMode, requiredItems.length, uploadedCount, photos])

  return (
    <main className="app-shell">
      <div className="page-top-actions">
        <BackButton label={t.photoReport.back} onBack={onBack} />
        <button
          aria-label="Почати фотозвіт заново"
          className="photo-report-reset-button"
          disabled={isSubmitting}
          onClick={() => setShowResetConfirm(true)}
          type="button"
        >
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
            <path d="M20 4v6h-6" />
          </svg>
        </button>
      </div>

      <section className="app-header vertical">
        <p className="app-kicker">{t.photoReport.kicker}</p>
        <h1>{t.photoReport.title}</h1>
        <p className="app-subtitle">{t.photoReport.subtitle}</p>
      </section>

      {showResetConfirm && (
        <section className="panel photo-report-reset-confirm">
          <strong>Почати фотозвіт заново?</strong>
          <p>Усі незбережені локальні фото буде видалено.</p>
          <div>
            <button type="button" onClick={() => setShowResetConfirm(false)}>
              Скасувати
            </button>
            <button type="button" onClick={() => void resetLocalPhotoReport()}>
              Почати заново
            </button>
          </div>
        </section>
      )}

      {statusMessage && <div className={finalSuccess ? 'message-box success' : 'message-box'}>{statusMessage}</div>}

      <section ref={statusBlockRef} className="panel photo-report-status upload-status-panel">
        <strong>Фото зроблено: {doneCount} / {requiredItems.length}</strong>
        <span>{partialPhotoReportTestMode ? `Надіслано: ${uploadedCount} фото` : `Надіслано: ${uploadedCount} / ${requiredItems.length}`}</span>
        <span>{partialPhotoReportTestMode ? `Залишилось надіслати: ${pendingSelectedCount}` : `Залишилось: ${remainingCount}`}</span>
        {partialPhotoReportTestMode && (
          <em>Це тестовий режим. Можна надіслати неповний фотозвіт.</em>
        )}
        {doneCount === requiredItems.length && remainingCount > 0 && (
          <em>Не закривайте додаток до завершення. Фото збережені на телефоні.</em>
        )}
      </section>

      <section className="panel photo-report-rules">
        <strong>{t.photoReport.rulesTitle}</strong>
        <p>{t.photoReport.rulesText}</p>
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
              <div className="photo-report-item-copy">
                <h2>{item.item_name}</h2>
                {item.description && <p>{item.description}</p>}
              </div>
              {photo && (
                <div className="invoice-preview">
                  <img alt={item.item_name} src={photo.previewUrl} />
                </div>
              )}
              {photo && <span className={`photo-report-added status-${photo.status}`}>{photo.status === 'uploaded' ? 'Надіслано' : photo.status === 'uploading' ? 'Надсилаємо' : photo.status === 'failed' ? 'Не надіслано' : t.photoReport.photoAdded}</span>}
              <label className="file-picker">
                <strong>{photo ? t.photoReport.changePhoto : t.photoReport.takePhoto}</strong>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  type="file"
                  onChange={(event) => void setItemPhoto(item.id, event.target.files?.[0])}
                />
              </label>
            </div>
          )
        })}
      </section>

      <p className="photo-report-submit-hint">
        {isSubmitting ? 'Йде відправка. Не закривайте додаток.' : 'Після натискання дочекайтесь завершення відправки.'}
      </p>
      <button className="confirm-button" disabled={!canSubmit || isLoading} onClick={() => void submitReport()}>
        {isSubmitting ? 'Надсилаємо...' : remainingCount < requiredItems.length ? 'Надіслати залишок' : t.photoReport.send}
      </button>
    </main>
  )
}

export default PhotoReportPage
