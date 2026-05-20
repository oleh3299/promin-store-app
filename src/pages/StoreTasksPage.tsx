import { useCallback, useEffect, useMemo, useState } from 'react'
import BackButton from '../components/BackButton'
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
  mode: 'messages' | 'photoReport'
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
  rawStatus: StoreTaskStatus
  priority: StoreTaskItem['priority']
  actionLabel: 'Виконати' | 'Переглянути' | 'Підтвердити' | 'Відповісти'
  category: StoreTaskItem['category']
  categoryLabel: string
  senderName?: string | null
  isRocketMessage: boolean
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
const messageDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Uzhgorod',
})

const statusLabels: Record<StoreTaskStatus, string> = {
  new: 'Нове',
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
  photo_report: 'Фотозвіт',
  general: 'Адміністрація',
}

function taskCategoryLabel(task: StoreTaskItem) {
  if (task.source === 'rocket_chat' && task.category === 'photo_report') return 'Адміністрація'
  if (task.category === 'photo_report') return 'Фотозвіт'
  if (task.category === 'accounting') return 'Бухгалтерія'
  if (task.source_route_key === 'it') return 'Технічна служба'
  return task.category ? categoryLabels[task.category] ?? task.category : 'Адміністрація'
}

function taskFeedType(task: StoreTaskItem): FeedType {
  if (task.category === 'photo_report') {
    return 'Фотозвіт'
  }
  return task.source === 'rocket_chat' ? 'Повідомлення' : 'Завдання'
}

function taskFeedDescription(task: StoreTaskItem) {
  return task.description ?? task.department_name ?? 'Операційне завдання магазину'
}

const tabs: { key: FeedTab; label: string }[] = [
  { key: 'all', label: 'Усі' },
  { key: 'tasks', label: 'Завдання' },
  { key: 'messages', label: 'Повідомлення' },
  { key: 'urgent', label: 'Термінові' },
  { key: 'done', label: 'Виконані' },
]

function formatDeadline(task: StoreTaskItem) {
  if (!task.due_date) {
    return 'Без дедлайну'
  }

  const dateLabel = taskDateFormatter.format(new Date(`${task.due_date}T12:00:00`))
  return task.due_time ? `${dateLabel} ${task.due_time}` : dateLabel
}

function taskActionLabel(task: StoreTaskItem): FeedItem['actionLabel'] {
  if (task.source === 'rocket_chat' && (task.status === 'open' || task.status === 'new')) {
    return 'Відповісти'
  }

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

function messageStatusLabel(item: FeedItem) {
  if (item.rawStatus === 'completed' || item.rawStatus === 'verified') return 'Виконано'
  if (item.rawStatus === 'in_progress' || item.rawStatus === 'submitted') return 'Прочитано'
  return 'Нове'
}

function taskStatusLabel(item: FeedItem) {
  if (item.status === 'overdue') return 'Прострочено'
  if (item.status === 'done') return 'Виконано'
  if (item.status === 'review') return 'На перевірці'
  return 'Активно'
}

function StoreTasksPage({ device, mode, onBack }: StoreTasksPageProps) {
  const [tasks, setTasks] = useState<StoreTaskItem[]>([])
  const [selectedTask, setSelectedTask] = useState<StoreTaskDetail | null>(null)
  const [employees, setEmployees] = useState<ActiveStoreEmployee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<FeedTab>(mode === 'photoReport' ? 'all' : 'messages')
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
        'open,new,in_progress,submitted,rejected,completed,verified',
      )
      setTasks(response.items)
    } catch {
      setStatusMessage(mode === 'messages' ? 'Не вдалося оновити.\nПеревірте інтернет і спробуйте ще раз.' : 'Не вдалося завантажити завдання')
    } finally {
      setIsLoading(false)
    }
  }, [device.deviceToken, mode])

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
      time: task.source === 'rocket_chat' ? messageDateFormatter.format(new Date(task.created_at)) : formatDeadline(task),
      status: taskFeedStatus(task),
      rawStatus: task.status,
      priority: task.priority,
      actionLabel: taskActionLabel(task),
      category: task.category,
      categoryLabel: taskCategoryLabel(task),
      senderName: task.source_user_name,
      isRocketMessage: task.source === 'rocket_chat',
      taskId: task.id,
    }))

    return taskItems
  }, [tasks])

  const scopedFeedItems = useMemo(
    () =>
      mode === 'photoReport'
        ? feedItems.filter((item) => item.category === 'photo_report')
        : feedItems.filter((item) => item.isRocketMessage && item.category !== 'photo_report'),
    [feedItems, mode],
  )

  const summary = useMemo(
    () => ({
      active: scopedFeedItems.filter((item) => item.status === 'active' || item.status === 'review').length,
      overdue: scopedFeedItems.filter((item) => item.status === 'overdue').length,
      done: scopedFeedItems.filter((item) => item.status === 'done').length,
    }),
    [scopedFeedItems],
  )

  const filteredFeedItems = useMemo(() => {
    if (mode === 'messages') {
      return scopedFeedItems
    }

    if (activeTab === 'tasks') {
      return scopedFeedItems.filter((item) => item.type !== 'Повідомлення' && item.type !== 'Пуш')
    }
    if (activeTab === 'messages') {
      return scopedFeedItems.filter(
        (item) => item.isRocketMessage && item.category !== 'photo_report' && (item.rawStatus === 'open' || item.rawStatus === 'new'),
      )
    }
    if (activeTab === 'urgent') {
      return scopedFeedItems.filter((item) => item.priority === 'urgent' || item.priority === 'high' || item.status === 'overdue')
    }
    if (activeTab === 'done') {
      return scopedFeedItems.filter((item) => item.status === 'done')
    }

    return scopedFeedItems
  }, [activeTab, mode, scopedFeedItems])

  const employeeRequired = employees.length > 1 && selectedEmployeeId === null
  const canSubmit =
    Boolean(selectedTask) &&
    selectedTask !== null &&
    ['new', 'open', 'in_progress', 'rejected'].includes(selectedTask.status) &&
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
      setStatusMessage(response.message ?? 'Не вдалося оновити.\nПеревірте інтернет і спробуйте ще раз.')
    } catch {
      setStatusMessage('Не вдалося оновити.\nПеревірте інтернет і спробуйте ще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!device.deviceToken || !selectedTask || isSubmitting) return
    if (selectedTask.requires_photo && selectedTask.category !== 'photo_report' && !file) {
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
          selectedTask.source === 'rocket_chat' && comment.trim()
            ? 'Відповідь надіслано'
            : selectedTask.source === 'rocket_chat'
              ? 'Завдання позначено як виконане'
              : response.task.status === 'completed'
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
      setStatusMessage(response.message ?? 'Не вдалося оновити.\nПеревірте інтернет і спробуйте ще раз.')
    } catch {
      setStatusMessage('Не вдалося оновити.\nПеревірте інтернет і спробуйте ще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell daily-tasks-page">
      {selectedTask && <BackButton onBack={() => setSelectedTask(null)} />}

      {!selectedTask && <BackButton onBack={onBack} />}

      <section className="app-header vertical">
        <p className="app-kicker">{mode === 'photoReport' ? 'Фото-завдання' : 'Офіс'}</p>
        <h1>{selectedTask ? selectedTask.title : mode === 'photoReport' ? 'Фото-завдання' : 'Повідомлення'}</h1>
        {!selectedTask && (
          <p className="app-subtitle">
            {mode === 'messages'
              ? 'Завдання та повідомлення від офісу'
              : `${device.storeName ?? 'Поточний магазин'} · ${fullDateFormatter.format(new Date())}`}
          </p>
        )}
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      {!selectedTask && (
        <>
          {mode !== 'messages' && (
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
          )}

          {mode !== 'messages' && (
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
          )}

          {!isLoading && filteredFeedItems.length === 0 && (
            <section className="panel">
              <p className="empty-state">{mode === 'messages' ? 'Нових повідомлень немає' : 'У цьому фільтрі поки немає елементів.'}</p>
            </section>
          )}

          <section className="daily-feed">
            {filteredFeedItems.map((item) => (
              <article className={mode === 'messages' && (item.rawStatus === 'open' || item.rawStatus === 'new') ? 'panel feed-card message-feed-card unread' : mode === 'messages' ? 'panel feed-card message-feed-card' : 'panel feed-card'} key={item.id}>
                <div className="feed-card-top">
                  <span className="feed-type">{mode === 'messages' ? item.categoryLabel : item.type}</span>
                  <span className={`feed-status status-${item.status}`}>{mode === 'messages' ? messageStatusLabel(item) : taskStatusLabel(item)}</span>
                </div>
                <strong>{mode === 'messages' ? item.description : item.title}</strong>
                {mode === 'messages' && item.senderName && <small>Від: {item.senderName}</small>}
                {mode !== 'messages' && <p>{item.description}</p>}
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

          {(selectedTask.requires_photo || selectedTask.source === 'rocket_chat') && (
            <label className="file-picker">
              <span>Фото</span>
              <strong>{file ? 'Фото додано' : 'Додати фото'}</strong>
              <input
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                type="file"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
            </label>
          )}

          {(selectedTask.requires_comment || selectedTask.source === 'rocket_chat') && (
            <label>
              <span>Коментар</span>
              <textarea
                value={comment}
                placeholder={selectedTask.source === 'rocket_chat' ? 'Напишіть відповідь магазину' : 'Додайте короткий коментар'}
                rows={4}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
          )}

          {selectedTask.status === 'new' || selectedTask.status === 'open' || selectedTask.status === 'rejected' ? (
            <button className="wide-button secondary" disabled={isSubmitting} onClick={() => void handleStart()}>
              {selectedTask.source === 'rocket_chat' ? 'Відповісти' : 'Почати'}
            </button>
          ) : null}

          <button className="confirm-button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {isSubmitting ? 'Надсилаємо...' : selectedTask.source === 'rocket_chat' ? 'Виконано' : 'Надіслати виконання'}
          </button>
        </section>
      )}
    </main>
  )
}

export default StoreTasksPage
