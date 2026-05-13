import { useState } from 'react'
import './App.css'
import { canUseNotifications } from './lib/pwa'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import type { Screen, Shift } from './types/attendance'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [notificationStatus, setNotificationStatus] = useState(
    canUseNotifications() ? Notification.permission : 'unsupported',
  )

  const openShifts = shifts.filter((shift) => !shift.checkOutTime)

  if (screen === 'attendance') {
    return (
      <AttendancePage
        openShifts={openShifts}
        shifts={shifts}
        setShifts={setShifts}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <HomePage
      openShiftCount={openShifts.length}
      notificationStatus={notificationStatus}
      onNotificationStatusChange={setNotificationStatus}
      onOpenAttendance={() => setScreen('attendance')}
    />
  )
}

export default App
