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

type FeedTab = 'all' | 'tasks' | 'messages' | 'urgent' | 'done'
type FeedType = string
type FeedStatus = 'active' | 'overdue' | 'done' | 'review' | 'info'

type FeedItem = {
  id: string
  type: FeedType
  title: string
  description: string
  time: string
  status: FeedStatus
  priority: StoreTaskItem['priority']
  actionLabel: 'Виконати' | 'Переглянути' | 'Підтвердити'
  taskId?: number
}

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxTaskFileSize = 10 * 1024 * 1024
const serverUnavailableMessage = 'Немає зв’язку з сервером'
const taskDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Uzhgorod',
})
const fullDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Uzhgorod',
})

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

const categoryLabels: Record<string, string> = {
  accounting: 'Бухгалтерія',
  photo_report: 'Фотоотчіт',
  general: 'Адміністрація',
}

function taskFeedType(task: StoreTaskItem): FeedType {
  return task.source === 'rocket_chat' ? 'Повідомлення' : 'Завдання'
}

function taskFeedDescription(task: StoreTaskItem) {
  const description = task.description ?? task.department_name ?? 'Операційне завдання магазину'
  if (task.source !== 'rocket_chat') {
    return description
  }

  const category = task.category ? categoryLabels[task.category] ?? task.category : 'Адміністрація'
  const sender = task.source_user_name ? ` · ${task.source_user_name}` : ''
  return `${category}${sender}\n${description}`
}

const tabs: { key: FeedTab; label: string }[] = [
  { key: 'all', label: 'Усі' },
  { key: 'tasks', label: 'Завдання' },
  { key: 'messages', label: 'Повідомлення' },
  { key: 'urgent', label: 'Термінові' },
  { key: 'done', label: 'Виконані' },
]

const mockFeedItems: FeedItem[] = [
  {
    id: 'message-opening',
    type: 'Контроль',
    title: 'Перевірити готовність магазину',
    description: 'Вітрини, касова зона, фасад і цінники перед активним трафіком.',
    time: '09:00',
    status: 'active',
    priority: 'normal',
    actionLabel: 'Переглянути',
  },
  {
    id: 'push-prices',
    type: 'Пуш',
    title: 'Оновлення акційних цінників',
    description: 'Після переоцінки перевірте відповідність цінників у торговому залі.',
    time: '12:30',
    status: 'info',
    priority: 'high',
    actionLabel: 'Підтвердити',
  },
]

function formatDeadline(task: StoreTaskItem) {
  if (!task.due_date) {
    return 'Без дедлайну'
  }

  const dateLabel = taskDateFormatter.format(new Date(`${task.due_date}T12:00:00`))
  return task.due_time ? `${dateLabel} ${task.due_time}` : dateLabel
}

function taskActionLabel(task: StoreTaskItem): FeedItem['actionLabel'] {
  if (task.status === 'submitted') {
    return 'Переглянути'
  }

  if (task.status === 'completed' || task.status === 'verified') {
    return 'Переглянути'
  }

  return 'Виконати'
}

function taskFeedStatus(task: StoreTaskItem): FeedStatus {
  if (task.status === 'completed' || task.status === 'verified') {
    return 'done'
  }

  if (task.is_overdue) {
    return 'overdue'
  }

  if (task.status === 'submitted') {
    return 'review'
  }

  return 'active'
}

function StoreTasksPage({ device, onBack }: StoreTasksPageProps) {
  const [tasks, setTasks] = useState<StoreTaskItem[]>([])
  const [selectedTask, setSelectedTask] = useState<StoreTaskDetail | null>(null)
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<FeedTab>('all')
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

  const feedItems = useMemo<FeedItem[]>(() => {
    const taskItems = tasks.map((task): FeedItem => ({
      id: `task-${task.id}`,
      type: taskFeedType(task),
      title: task.title,
      description: taskFeedDescription(task),
      time: formatDeadline(task),
      status: taskFeedStatus(task),
      priority: task.priority,
      actionLabel: taskActionLabel(task),
      taskId: task.id,
    }))

    return [...mockFeedItems, ...taskItems]
  }, [tasks])

  const summary = useMemo(
    () => ({
      active: feedItems.filter((item) => item.status === 'active' || item.status === 'review').length,
      overdue: feedItems.filter((item) => item.status === 'overdue').length,
      done: feedItems.filter((item) => item.status === 'done').length,
    }),
    [feedItems],
  )

  const filteredFeedItems = useMemo(() => {
    if (activeTab === 'tasks') {
      return feedItems.filter((item) => item.type !== 'Повідомлення' && item.type !== 'Пуш')
    }
    if (activeTab === 'messages') {
      return feedItems.filter((item) => item.type === 'Повідомлення' || item.type === 'Пуш')
    }
    if (activeTab === 'urgent') {
      return feedItems.filter((item) => item.priority === 'urgent' || item.priority === 'high' || item.status === 'overdue')
    }
    if (activeTab === 'done') {
      return feedItems.filter((item) => item.status === 'done')
    }

    return feedItems
  }, [activeTab, feedItems])

  const employeeRequired = employees.length > 1 && selectedEmployeeId === null
  const canSubmit =
    Boolean(selectedTask) &&
    selectedTask !== null &&
    ['open', 'in_progress', 'rejected'].includes(selectedTask.status) &&
    !employeeRequired &&
    !isSubmitting

  const openTask = async (taskId: number) => {
    if (!device.deviceToken) return

    setStatusMessage('')
    setFile(null)
    setComment('')
    try {
      const detail = await getStoreTask(device.deviceToken, taskId)
      setSelectedTask(detail)
    } catch {
      setStatusMessage('Не вдалося відкрити завдання')
    }
  }

  const handleFeedAction = (item: FeedItem) => {
    if (item.taskId) {
      void openTask(item.taskId)
      return
    }

    setStatusMessage('Елемент додано до денного стеку. Дія буде підключена пізніше.')
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
    if (!navigator.onLine) {
      setStatusMessage(serverUnavailableMessage)
      return
    }

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
    if (!navigator.onLine) {
      setStatusMessage(serverUnavailableMessage)
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
    <main className="app-shell daily-tasks-page">
      {selectedTask && (
        <button className="back-button" onClick={() => setSelectedTask(null)}>
          Назад
        </button>
      )}

      {!selectedTask && (
        <button className="back-button" onClick={onBack}>
          Назад
        </button>
      )}

      <section className="app-header vertical">
        <p className="app-kicker">Завдання</p>
        <h1>{selectedTask ? selectedTask.title : 'Завдання на день'}</h1>
        {!selectedTask && (
          <p className="app-subtitle">
            {device.storeName ?? 'Поточний магазин'} · {fullDateFormatter.format(new Date())}
          </p>
        )}
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      {!selectedTask && (
        <>
          <section className="daily-summary">
            <div>
              <strong>{summary.active}</strong>
              <span>Активні</span>
            </div>
            <div className={summary.overdue > 0 ? 'attention' : undefined}>
              <strong>{summary.overdue}</strong>
              <span>Прострочені</span>
            </div>
            <div>
              <strong>{summary.done}</strong>
              <span>Виконані</span>
            </div>
          </section>

          <section className="feed-tabs" aria-label="Фільтри завдань">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'active' : undefined}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </section>

          {!isLoading && filteredFeedItems.length === 0 && (
            <section className="panel">
              <p className="empty-state">У цьому фільтрі поки немає елементів.</p>
            </section>
          )}

          <section className="daily-feed">
            {filteredFeedItems.map((item) => (
              <article className="panel feed-card" key={item.id}>
                <div className="feed-card-top">
                  <span className="feed-type">{item.type}</span>
                  <span className={`feed-status status-${item.status}`}>{item.status === 'overdue' ? 'Прострочено' : item.status === 'done' ? 'Виконано' : item.status === 'review' ? 'На перевірці' : 'Активно'}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <div className="feed-meta">
                  <span>{item.time}</span>
                  <span>{priorityLabels[item.priority]}</span>
                </div>
                <button type="button" onClick={() => handleFeedAction(item)}>
                  {item.actionLabel}
                </button>
              </article>
            ))}
          </section>
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
