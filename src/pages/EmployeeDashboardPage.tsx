import type { AuthState, DeviceState, Shift } from '../types/attendance'

type EmployeeDashboardPageProps = {
  auth: AuthState
  device: DeviceState
  openShifts: Shift[]
  shifts: Shift[]
  onOpenAttendance: () => void
  onOpenStoreTasks: () => void
  onOpenStoreRequests: () => void
  onOpenSettings: () => void
}

function getShiftDurationLabel(shift: Shift | undefined) {
  if (!shift) {
    return '0 год 00 хв'
  }

  const [hours = '0', minutes = '0'] = shift.checkInTime.split(':')
  const start = new Date()
  start.setHours(Number(hours), Number(minutes), 0, 0)

  const diffMinutes = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000))
  const durationHours = Math.floor(diffMinutes / 60)
  const durationMinutes = diffMinutes % 60

  return `${durationHours} год ${String(durationMinutes).padStart(2, '0')} хв`
}

function EmployeeDashboardPage({
  auth,
  device,
  openShifts,
  shifts,
  onOpenAttendance,
  onOpenStoreTasks,
  onOpenStoreRequests,
  onOpenSettings,
}: EmployeeDashboardPageProps) {
  const currentShift = openShifts[0]
  const latestShift = currentShift ?? shifts[0]
  const employeeName = currentShift?.employeeName ?? auth.fullName ?? device.deviceName ?? 'Співробітник магазину'
  const employeePosition = currentShift?.position ?? 'Команда магазину'
  const isOnShift = Boolean(currentShift)

  return (
    <main className="app-shell employee-dashboard">
      <section className="employee-hero">
        <div className="employee-avatar" aria-hidden="true">
          {employeeName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="app-kicker">Профіль співробітника</p>
          <h1>{employeeName}</h1>
          <p>{employeePosition}</p>
          <span className={isOnShift ? 'employee-status on-shift' : 'employee-status'}>
            {isOnShift ? 'На зміні' : 'Не на зміні'}
          </span>
        </div>
      </section>

      <section className="profile-section-grid">
        <article className="panel profile-card today-card">
          <span>Сьогодні</span>
          <div className="profile-row">
            <small>Час приходу</small>
            <strong>{latestShift?.checkInTime ?? '--:--'}</strong>
          </div>
          <div className="profile-row">
            <small>Тривалість зміни</small>
            <strong>{getShiftDurationLabel(currentShift)}</strong>
          </div>
          <div className="profile-row">
            <small>Статус табелю</small>
            <strong>{isOnShift ? 'Відкрито' : 'Очікує зміну'}</strong>
          </div>
        </article>

        <article className="panel profile-card">
          <span>Завдання</span>
          <div className="metric-strip">
            <div>
              <strong>0</strong>
              <small>Активні</small>
            </div>
            <div>
              <strong>0</strong>
              <small>Виконані</small>
            </div>
            <div>
              <strong>0</strong>
              <small>Прострочені</small>
            </div>
          </div>
        </article>

        <article className="panel profile-card">
          <span>Показники</span>
          <div className="indicator-grid">
            <div>
              <small>Бали</small>
              <strong>--</strong>
            </div>
            <div>
              <small>Штрафи</small>
              <strong>--</strong>
            </div>
            <div>
              <small>Оцінка</small>
              <strong>--</strong>
            </div>
            <div>
              <small>План</small>
              <strong>--</strong>
            </div>
          </div>
        </article>

        <article className="panel profile-card badge-card">
          <span>Бейдж</span>
          <div className="badge-placeholder" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <strong>Бейдж співробітника</strong>
        </article>
      </section>

      <section className="quick-actions">
        <button type="button" onClick={onOpenAttendance}>Мій табель</button>
        <button type="button" onClick={onOpenStoreTasks}>Мої завдання</button>
        <button type="button" onClick={onOpenStoreRequests}>Повідомлення</button>
        <button type="button" onClick={onOpenSettings}>Налаштування</button>
      </section>
    </main>
  )
}

export default EmployeeDashboardPage
