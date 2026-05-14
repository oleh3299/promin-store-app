import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getStoreRequestActiveEmployees,
  getStoreTask,
  getStoreTasks,
  startStoreTask,
  submitStoreTask,
} from '../api/client'
import type { ActiveStoreEmployee, StoreTaskDetail, StoreTaskItem, StoreTaskStatus } from '../api/types'
import type { DeviceState } from '../types/attendance'

type StoreTasksPageProps = {
  device: DeviceState
  onBack: () => void
}

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxTaskFileSize = 10 * 1024 * 1024
const taskDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Uzhgorod',
})

const groups: { title: string; statuses: StoreTaskStatus[] }[] = [
  { title: 'Нові', statuses: ['open'] },
  { title: 'В роботі', statuses: ['in_progress'] },
  { title: 'На перевірці', statuses: ['submitted'] },
  { title: 'Відхилені', statuses: ['rejected'] },
  { title: 'Виконані', statuses: ['completed', 'verified'] },
]

const statusLabels: Record<StoreTaskStatus, string> = {
  open: 'Нове',
  in_progress: 'В роботі',
  submitted: 'На перевірці',
  completed: 'Виконано',
  verified: 'Підтверджено',
  rejected: 'Відхилено',
  cancelled: 'Скасовано',
}

const priorityLabels: Record<StoreTaskItem['priority'], string> = {
  low: 'Низький',
  normal: 'Звичайний',
  high: 'Високий',
  urgent: 'Терміново',
}

function formatDeadline(task: StoreTaskItem) {
  if (!task.due_date) {
    return 'Без дедлайну'
  }

  const dateLabel = taskDateFormatter.format(new Date(`${task.due_date}T12:00:00`))
  return task.due_time ? `${dateLabel} ${task.due_time}` : dateLabel
}

function StoreTasksPage({ device, onBack }: StoreTasksPageProps) {
  const [tasks, setTasks] = useState<StoreTaskItem[]>([])
  const [selectedTask, setSelectedTask] = useState<StoreTaskDetail | null>(null)
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [comment, setComment] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadTasks = useCallback(async () => {
    if (!device.deviceToken) {
      setTasks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await getStoreTasks(
        device.deviceToken,
        'open,in_progress,submitted,rejected,completed,verified',
      )
      setTasks(response.items)
    } catch {
      setStatusMessage('Не вдалося завантажити завдання')
    } finally {
      setIsLoading(false)
    }
  }, [device.deviceToken])

  const loadEmployees = useCallback(async () => {
    if (!device.deviceToken) {
      setEmployees([])
      return
    }

    try {
      const response = await getStoreRequestActiveEmployees(device.deviceToken)
      setEmployees(response.items)
      setSelectedEmployeeId(response.items.length === 1 ? response.items[0].employee_id : null)
    } catch {
      setEmployees([])
      setSelectedEmployeeId(null)
    }
  }, [device.deviceToken])

  useEffect(() => {
    void loadTasks()
    void loadEmployees()
  }, [loadEmployees, loadTasks])

  const groupedTasks = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        tasks: tasks.filter((task) => group.statuses.includes(task.status)),
      })),
    [tasks],
  )

  const employeeRequired = employees.length > 1 && selectedEmployeeId === null
  const canSubmit =
    Boolean(selectedTask) &&
    selectedTask !== null &&
    ['open', 'in_progress', 'rejected'].includes(selectedTask.status) &&
    !employeeRequired &&
    !isSubmitting

  const openTask = async (task: StoreTaskItem) => {
    if (!device.deviceToken) return

    setStatusMessage('')
    setFile(null)
    setComment('')
    try {
      const detail = await getStoreTask(device.deviceToken, task.id)
      setSelectedTask(detail)
    } catch {
      setStatusMessage('Не вдалося відкрити завдання')
    }
  }

  const handleFileChange = (nextFile: File | undefined) => {
    setStatusMessage('')
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!allowedImageTypes.includes(nextFile.type)) {
      setStatusMessage('Підтримуються лише JPEG, PNG або WEBP')
      setFile(null)
      return
    }
    if (nextFile.size > maxTaskFileSize) {
      setStatusMessage('Фото завелике')
      setFile(null)
      return
    }
    setFile(nextFile)
  }

  const handleStart = async () => {
    if (!device.deviceToken || !selectedTask) return

    setIsSubmitting(true)
    setStatusMessage('')
    try {
      const response = await startStoreTask(device.deviceToken, selectedTask.id)
      if (response.ok && response.task) {
        setSelectedTask({ ...selectedTask, ...response.task })
        await loadTasks()
        return
      }
      setStatusMessage(response.message ?? 'Не вдалося почати завдання')
    } catch {
      setStatusMessage('Не вдалося почати завдання')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!device.deviceToken || !selectedTask || isSubmitting) return
    if (selectedTask.requires_photo && !file) {
      setStatusMessage('Додайте фото')
      return
    }
    if (selectedTask.requires_comment && !comment.trim()) {
      setStatusMessage('Додайте коментар')
      return
    }
    if (employeeRequired) {
      setStatusMessage('Оберіть співробітника')
      return
    }

    const formData = new FormData()
    if (selectedEmployeeId !== null) {
      formData.append('employee_id', String(selectedEmployeeId))
    }
    if (comment.trim()) {
      formData.append('comment', comment.trim())
    }
    if (file) {
      formData.append('file', file)
    }

    setIsSubmitting(true)
    setStatusMessage('')
    try {
      const response = await submitStoreTask(device.deviceToken, selectedTask.id, formData)
      if (response.ok && response.task) {
        setStatusMessage(
          response.task.status === 'completed'
            ? 'Завдання виконано'
            : 'Завдання відправлено на перевірку',
        )
        setSelectedTask(null)
        setFile(null)
        setComment('')
        await loadTasks()
        return
      }
      if (response.error === 'employee_required') {
        setStatusMessage('Оберіть співробітника')
        return
      }
      if (response.error === 'file_required') {
        setStatusMessage('Додайте фото')
        return
      }
      if (response.error === 'comment_required') {
        setStatusMessage('Додайте коментар')
        return
      }
      setStatusMessage(response.message ?? 'Не вдалося надіслати виконання')
    } catch {
      setStatusMessage('Не вдалося надіслати виконання')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <button className="back-button" onClick={selectedTask ? () => setSelectedTask(null) : onBack}>
        Назад
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">Завдання</p>
        <h1>{selectedTask ? selectedTask.title : 'Завдання магазину'}</h1>
        {!selectedTask && <p className="app-subtitle">Операційні завдання поточного магазину.</p>}
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      {!selectedTask && (
        <>
          {!isLoading && tasks.length === 0 && (
            <section className="panel">
              <p className="empty-state">Активних завдань немає.</p>
            </section>
          )}

          {groupedTasks.map(
            (group) =>
              group.tasks.length > 0 && (
                <section className="task-group" key={group.title}>
                  <h2>{group.title}</h2>
                  <div className="task-list">
                    {group.tasks.map((task) => (
                      <button className="panel task-card" key={task.id} type="button" onClick={() => void openTask(task)}>
                        <span className={`task-status status-${task.status}`}>{statusLabels[task.status]}</span>
                        <strong>{task.title}</strong>
                        {task.department_name && <small>{task.department_name}</small>}
                        <div className="task-meta">
                          <span>{formatDeadline(task)}</span>
                          <span>{priorityLabels[task.priority]}</span>
                        </div>
                        <div className="task-flags">
                          {task.requires_photo && <span>Потрібне фото</span>}
                          {task.requires_comment && <span>Потрібен коментар</span>}
                          {task.is_overdue && <span className="danger">Прострочено</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ),
          )}
        </>
      )}

      {selectedTask && (
        <section className="panel task-detail">
          <div className="task-meta">
            <span>{statusLabels[selectedTask.status]}</span>
            <span>{priorityLabels[selectedTask.priority]}</span>
            <span>{formatDeadline(selectedTask)}</span>
          </div>

          {selectedTask.description && <p>{selectedTask.description}</p>}

          <div className="employee-card">
            <span>Співробітник</span>
            {employees.length === 0 && <strong>Співробітник не вказаний</strong>}
            {employees.length === 1 && <strong>{employees[0].full_name}</strong>}
            {employees.length > 1 && (
              <select
                value={selectedEmployeeId ?? ''}
                onChange={(event) =>
                  setSelectedEmployeeId(event.target.value ? Number(event.target.value) : null)
                }
              >
                <option value="">Хто виконує?</option>
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedTask.requires_photo && (
            <label className="file-picker">
              <span>Фото виконання</span>
              <strong>{file ? 'Фото додано' : 'Зробити фото'}</strong>
              <input
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                type="file"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
            </label>
          )}

          {selectedTask.requires_comment && (
            <label>
              <span>Коментар</span>
              <textarea
                value={comment}
                placeholder="Додайте короткий коментар"
                rows={4}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
          )}

          {selectedTask.status === 'open' || selectedTask.status === 'rejected' ? (
            <button className="wide-button secondary" disabled={isSubmitting} onClick={() => void handleStart()}>
              Почати
            </button>
          ) : null}

          <button className="confirm-button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {isSubmitting ? 'Надсилання' : 'Надіслати виконання'}
          </button>
        </section>
      )}
    </main>
  )
}

export default StoreTasksPage
