import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { canUseNotifications } from './lib/pwa'
import {
  loadAppPersistence,
  saveAppPersistence,
} from './lib/storage'
import { useI18n } from './i18n/useI18n'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import type { AttendancePageState, Screen, Shift } from './types/attendance'

function App() {
  const [initialState] = useState(loadAppPersistence)
  const [screen, setScreen] = useState<Screen>(initialState.screen)
  const [selectedStore] = useState(initialState.selectedStore)
  const [language, setLanguage] = useState(initialState.language)
  const [shifts, setShifts] = useState<Shift[]>(initialState.shifts)
  const [attendancePageState, setAttendancePageState] =
    useState<AttendancePageState>(initialState.attendancePage)
  const [notificationStatus, setNotificationStatus] = useState(
    canUseNotifications() ? Notification.permission : 'unsupported',
  )

  const t = useI18n(language)
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
      language,
      screen,
      shifts,
      attendancePage: attendancePageState,
    })
  }, [attendancePageState, language, screen, selectedStore, shifts])

  if (screen === 'attendance') {
    return (
      <AttendancePage
        initialState={attendancePageState}
        openShifts={openShifts}
        shifts={shifts}
        setShifts={setShifts}
        t={t}
        onStateChange={handleAttendancePageStateChange}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <SettingsPage
        notificationStatus={notificationStatus}
        t={t}
        onNotificationStatusChange={setNotificationStatus}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <HomePage
      openShiftCount={openShifts.length}
      language={language}
      t={t}
      onLanguageChange={setLanguage}
      onOpenAttendance={() => setScreen('attendance')}
      onOpenSettings={() => setScreen('settings')}
    />
  )
}

export default App
