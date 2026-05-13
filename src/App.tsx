import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { canUseNotifications } from './lib/pwa'
import {
  loadAppPersistence,
  saveAppPersistence,
} from './lib/storage'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import type { AttendancePageState, Screen, Shift } from './types/attendance'

function App() {
  const [initialState] = useState(loadAppPersistence)
  const [screen, setScreen] = useState<Screen>(initialState.screen)
  const [selectedStore] = useState(initialState.selectedStore)
  const [shifts, setShifts] = useState<Shift[]>(initialState.shifts)
  const [attendancePageState, setAttendancePageState] =
    useState<AttendancePageState>(initialState.attendancePage)
  const [notificationStatus, setNotificationStatus] = useState(
    canUseNotifications() ? Notification.permission : 'unsupported',
  )

  const openShifts = shifts.filter((shift) => !shift.checkOutTime)
  const handleAttendancePageStateChange = useCallback(
    (state: AttendancePageState) => {
      setAttendancePageState(state)
    },
    [],
  )

  useEffect(() => {
    saveAppPersistence({
      selectedStore,
      screen,
      shifts,
      attendancePage: attendancePageState,
    })
  }, [attendancePageState, screen, selectedStore, shifts])

  if (screen === 'attendance') {
    return (
      <AttendancePage
        initialState={attendancePageState}
        openShifts={openShifts}
        shifts={shifts}
        setShifts={setShifts}
        onStateChange={handleAttendancePageStateChange}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <HomePage
      openShiftCount={openShifts.length}
      notificationStatus={notificationStatus}
      selectedStore={selectedStore}
      onNotificationStatusChange={setNotificationStatus}
      onOpenAttendance={() => setScreen('attendance')}
    />
  )
}

export default App
